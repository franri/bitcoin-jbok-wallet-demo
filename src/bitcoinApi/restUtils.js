import axios from 'axios';

const BASE = 'https://api.blockcypher.com/v1/btc/test3';



export async function infoAddress(accountAddress){
    let endpoint = `/addrs/${accountAddress}/balance`;
    endpoint = BASE + endpoint;
    const addressData = await axios.get(endpoint);
    const {address, balance, unconfirmed_balance} = addressData.data;
    return {address, balance, unconfirmed_balance};
}

export async function infoTx(accountAddress){
    let endpoint = `/addrs/${accountAddress}/full`;
    endpoint = BASE + endpoint;
    const txData = await axios.get(endpoint);
    return txData.data.txs;
}

export async function getUtxos(accountAddress){
    let endpoint = `/addrs/${accountAddress}?unspentOnly=true`;
    endpoint = BASE + endpoint;
    const accountData = await axios.get(endpoint);
    return accountData.data;
}

export async function sendTx(hex){
    let endpoint = `/txs/push`;
    endpoint = BASE + endpoint;
    let res;
    try{
    res = await axios.post(endpoint, {tx: hex});
    }catch(err){console.log(err);}
    return {status: res.status, tx: res.body};

}



