import readline from 'readline-sync';
const rl = readline;
import util from 'util'
import bip32 from 'bip32';
import bip39 from 'bip39';
import bitcoin from 'bitcoinjs-lib'

import { Wallet } from "./wallet/wallet.js";

const printKeys = w => {
    let s = `Currently loaded addresses ~ mnemonics:
    `;
    let curr = 0;
    w.keys.forEach(e => {
        s += `${curr++} - ${e.address} ~ ${e.mnemonic}
        `;
    });
    console.log(s);
}

const createMnemo = w => {
    const {saved, mnemonic } = w.createNewMnemonic();
    if (saved){
        console.log(`A new mnemonic
        ${mnemonic}
        has been saved`);
    } else {
        console.log('Error saving mnemonic.');
    }
}

const importMnemo = w => {
    const userMnemonic = rl.question('Carefully type in your mnemonic:');
    const { saved, mnemonic } = wallet.importMnemonic(userMnemonic);
    if (saved){
        console.log(`A new mnemonic
        ${mnemonic}
        has been imported`);
    } else {
        console.log('Error importing mnemonic.');
    }
}

const changeAddress = w => {
    const i = rl.question(`Insert address number where change should be sent to.
                Remember you can check your currently loaded addresses in sub-menu 3.
                `);
    const { saved, changeAddress } = w.setChangeAddress(parseInt(i));
    if (saved){
        console.log(`Address ${changeAddress} has been chosen as the change address.`);
    } else {
        console.log('Error changing address. Please check your input.');
    }
}

const showWalletBalance = w => {
    console.log("Fetching data from Blockcypher´s API...");
    w.findBalance().then( d => {
        console.log(util.inspect(d, false, null, true /* enable colors */));
        main();
    }).catch(console.log);
}

const showWalletTransactions = w => {
    console.log("Fetching data from Blockcypher´s API...");
    w.getTx().then( d => {
        console.log(util.inspect(d, false, null, true /* enable colors */));
        main();
    }).catch(console.log);
}

const sendTx = w => {
    const to = rl.question(`Insert receiving address:`);
    const amount = rl.question(`Insert amount to send:`);
    const fee = rl.question(`Insert fee:`);
    console.log("Fetching data from Blockcypher´s API...");
    w.makeTx(amount, to, fee)
        .then(({status, msg}) => {
            console.log(msg);
            main();
        })
        .catch(console.log);
}

const showPrompt = (w) => {
    console.log(`
    =====================================
    Bitcoin Wallet - Main Menu
    =====================================
    Current change address: ${w.changeAddress}
    You can choose any of the following options:

    1. Create a new mnemonic.
    2. Import a mnemonic.
    3. See all mnemonics and addresses registered in this wallet.
    4. Change change address.
    5. Show balance on a per-wallet and per-address basis.
    6. Show information about this wallet's transactions, on a per-address basis.
    7. Send bitcoin to a specified address, with a specified fee, withdrawing from the wallet as a whole (smallest UTXOs used up first).
    8. Show this prompt.
    9. Exit.

    `);
}

console.log(`This is a demo. Please check that your inputs are sensible enough, and try not to break me apart :)\n`);

const wallet = new Wallet(bitcoin.networks.regtest, 'keys');
if (wallet.keys.length===0){
    let correctOption = false;
    while (!correctOption) {
        const o = rl.question(
            `
            You haven't got any keys yet. Would you like to create(1) or import(2) one?
                1. Create a new random address from a mnemonic
                2. Import an address using an existing mnemonic
            `);
            switch(o){
                case '1':
                    
                    createMnemo(wallet);
                    correctOption = true;

                break;

                case '2':

                    importMnemo(wallet);
                    correctOption = true;

                break;

                default:

                    console.log("Please select one correct option.");
                    

                break;
            }
    }
    
} else {
    printKeys(wallet);
}

//wallet.getTx()
//    .then(d => console.log(util.inspect(d, false, null, true /* enable colors */)));
//console.log(bitcoin.ECPair.fromPrivateKey(wallet.keys[0].root.privateKey));

// wallet.makeTX();

//wallet.makeTx(100, 'miahefkXf1jSF1PXsYdXWSb245hvZoJ3Br', 999999999999).then(console.log);
// wallet.findBalance().then(console.log);


const main = () => {
    const o = rl.question(
        `
        Waiting for user prompt...

        `);

        switch(o){

            case '1':
                createMnemo(wallet);
                main();
            break;
            
            case '2':
                importMnemo(wallet);
                main();
            break;

            case '3':
                printKeys(wallet);
                main();
            break;

            case '4':

                changeAddress(wallet);
                main();
            break;

            case '5':
                showWalletBalance(wallet);
            break;

            case '6':

                showWalletTransactions(wallet);

            break;

           
            case '7':
                sendTx(wallet);
            break;

            case '8':
                showPrompt(wallet);
                main();
            break;

            case '9':
                // nada, para que se vaya
            break;

            default:

                console.log("Please select one correct option.");
                main();

            break;
        }
}

showPrompt(wallet);
main();