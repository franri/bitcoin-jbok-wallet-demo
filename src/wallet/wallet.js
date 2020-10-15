import bip32 from 'bip32';
import bip39 from 'bip39';
import bitcoin from 'bitcoinjs-lib'
import fs from 'fs';
import Heap from 'heap';


import { infoAddress, infoTx, getUtxos, sendTx } from './../bitcoinApi/restUtils.js';

class Wallet{

    constructor(net, address){
        this.net = net;
        this.keyAddress = address;
        this.STRENGTH = 256;
        this.keys = [];
        this.loadKeysFromDisk();
        if (this.keys.length>0) this.setChangeAddress(0);
    }

    async makeTx(strAmount, to, strFee){
        const amount = parseInt(strAmount);
        const fee = parseInt(strFee);
        // checkear que tengo suficiente guita
        const suitableAddresses = await this.keys.filter(e => e.address != to);
        let money = 0;
        // https://www.npmjs.com/package/heap
        const heap = new Heap( (a, b) => a.value - b.value );
        // veo si me da la guita de todas las cuentas
        for (const a of suitableAddresses){
            const {address, balance, unconfirmed_balance} = await infoAddress(a.address);
            money += balance;
            if (money >= amount + fee) break;
        }
        if ( money < amount + fee ) {
            return { status: false, msg: 'Insufficient funds.'};
        }
        // agarro todas las utxo y ordeno de menor a mayor, y voy usando de mas chicas a mas grandes
        // paro cuando ya agarre suficiente plata
        money = 0;
        for (const a of suitableAddresses){
            const ret = await getUtxos(a.address);
            if (!ret.txrefs && !ret.unconfirmed_txrefs) continue;
            let allUtxos = ret.txrefs;
            if (!allUtxos) continue;
            for (const utxo of allUtxos){
                if (!utxo.value) continue;
                heap.push({
                    hash: utxo.tx_hash,
                    value: utxo.value,
                    output_n: utxo.tx_output_n,
                    keyPair: bitcoin.ECPair.fromPrivateKey(a.root.privateKey, {network: this.net})
                });
                money += utxo.value;
            }
        }
                
        const tx = new bitcoin.TransactionBuilder(this.net);
        let currMoney = 0;
        let currInput = 0;
        
        const signers = {};
        while (currMoney < amount + fee){
            const currUTXO = heap.pop();
            tx.addInput(currUTXO.hash, currUTXO.output_n);
            signers[currInput++] = currUTXO.keyPair;
            currMoney += currUTXO.value;
        }
        
        tx.addOutput(to, amount);
        const change = currMoney - amount - fee;
        if (change > 0){
            tx.addOutput(this.changeAddress, change);
        }

        for (const [i, k] of Object.entries(signers)) {
            tx.sign(parseInt(i), k);
          }

        const txHex = tx.build().toHex();
        const res = await sendTx(txHex);
        if (res.status === 201){
            return { status: true, msg: 'TX sent successfully .'};
        } else {
            return { status: false, msg: 'Error sending TX.'};
        }
        

    }

    setChangeAddress(i){
        if (i < this.keys.length){
            this.changeAddress = this.keys[i].address;
            return {saved: true, changeAddress: this.changeAddress};
        } else {
            return {saved: false, changeAddress: null};
        }
    }

    async findBalance(){
        const balances = {};
        balances['total'] = {balance: 0, unconfirmed: 0};
        for (const {mnemonic, seed, root, address} of this.keys) {
            const {address:returnedAddress, balance, unconfirmed_balance} = await infoAddress(address);
            balances['total'].balance += balance;
            balances['total'].unconfirmed += unconfirmed_balance;
            if( !(returnedAddress in balances) ){
                balances[returnedAddress] = {balance: 0, unconfirmed: 0};
            }
            balances[returnedAddress].balance += balance;
            balances[returnedAddress].unconfirmed += unconfirmed_balance;
        };
        return balances;
    }

    async getTx(){
        const txsInfo = {};
        for (const {mnemonic, seed, root, address} of this.keys) {
            const txs = await infoTx(address);
            if ( !txs || txs.length == 0) continue;
            if (!txsInfo[address]) txsInfo[address] = {};
            const currAddress = txsInfo[address];
            currAddress.address = address;
            for (const tx of txs){
                if (!currAddress[tx.hash]) currAddress[tx.hash] = {};
                currAddress[tx.hash].hash = tx.hash;
                const currTx = currAddress[tx.hash];
                // paso de formato fecha+hora internacional a fecha uruguaya
                currTx.date = tx.confirmed ? tx.confirmed.substring(0, tx.received.indexOf('T')).split('-').reverse().join('/') : 'not confirmed yet';
                // agarro tx i/o s y separo en inputs y outputs
                const inputs = tx.inputs;
                const outputs = tx.outputs;
                currTx.inputs = [];
                currTx.outputs = []
                inputs.forEach(input => currTx.inputs.push({address: input.addresses[0], value: input.output_value}));
                outputs.forEach(output => currTx.outputs.push({address: output.addresses[0], value: output.value, spent: !!output.spent_by}));
            }
        }
        return txsInfo;
    }

    loadKeysFromDisk(){
        let lines;
        try{
            lines = fs.readFileSync(this.keyAddress).toString().split("\n");
        }catch(err){
            fs.closeSync(fs.openSync(this.keyAddress, 'w'));
            this.loadKeysFromDisk(this.keyAddress);
            return;
        }
        for (const mnemonic of lines) {
            if (mnemonic.length==0) continue;
            this.keys.push(this.__genPrivKeyAddress(mnemonic));
        }
    }

    createNewMnemonic(){
        const mnemonic = bip39.generateMnemonic(this.STRENGTH);
        this.keys.push(this.__genPrivKeyAddress(mnemonic));
        this.__updateChangeAddress();
        const s = this.__appendToKeyFile(mnemonic);
        return {saved: s, mnemonic: mnemonic};
    }

    importMnemonic(mnemonic){
        const keyContainsMnemonic = this.keys.filter(data => data.mnemonic == mnemonic).length !== 0
        if (keyContainsMnemonic) {
            return {saved: false, mnemonic: mnemonic};
        } else {
            this.keys.push(this.__genPrivKeyAddress(mnemonic));
            this.__updateChangeAddress();
            const s = this.__appendToKeyFile(mnemonic);
            return {saved: s, mnemonic: mnemonic};
        }
    }

    __updateChangeAddress(){
        if (this.keys.length === 1) {
            this.setChangeAddress(0);
        }
    }



    __genPrivKeyAddress(mnemonic){
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = bip32.fromSeed(seed, this.net);
        const address = bitcoin.payments.p2pkh({ pubkey: root.publicKey, network: this.net }).address;
        return {
            mnemonic: mnemonic,
            seed: seed,
            root: root,
            address: address
        };
    }

    __appendToKeyFile(mnemonic){

        fs.appendFileSync(this.keyAddress, '\n'+mnemonic);
        try {
            if (!fs.existsSync(this.keyAddress))
              fs.writeFileSync(this.keyAddress,'');
      
            fs.appendFileSync(this.keyAddress, '\n'+mnemonic);
            return true;
      
          } catch (err) {
            return false;
          }
    }

}

export { Wallet };