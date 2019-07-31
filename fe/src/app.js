import { h, render } from 'preact-cycle';
import bch from 'bitcore-lib-cash';
import lzs from 'lz-string';


function init() {
  if (!localStorage) {
    alert('No localStorage!!!! new key will not be saved!');
  }
  else {
    const cWIF = localStorage.getItem('privatekey');

    if (cWIF) return new bch.PrivateKey.fromWIF(lzs.decompressFromUTF16(cWIF));

    const privateKey = getAddressWithPrefix('qqq');

    localStorage.setItem('privatekey', lzs.compressToUTF16(privateKey.toWIF()));

    return privateKey;
  }
}

function getAddressData (address) {
  return fetch(`https://api.blockchair.com/bitcoin-cash/dashboards/address/${address.toString()}`)
    .then(response => response.json())
    .then(json => json.data[Object.keys(json.data)[0]])
    .catch(error => console.log(error));
}

function getTransactions (txids) {
  return fetch(`https://api.blockchair.com/bitcoin-cash/dashboards/transactions/${txids.join(',')}`)
	  .then(response => response.json())
	  .catch(error => console.log('txids', txids, error));
}

const {INIT, SEND_TRANSACTION, SET_ADDRESS_DATA, SET_TRANSACTION_DATA} = {
  INIT: (_, mutation) => {
    _.inited = true;
    _.mutation = mutation;

    getAddressData(address)
      .then(mutation(SET_ADDRESS_DATA))
      .then(() => getTransactions(_.data.transactions))
      .then(mutation(SET_TRANSACTION_DATA));

    return _;
  },

  SEND_TRANSACTION: (_) => {
    const fee = 100;
    const transaction = new bch.Transaction()
	                       .from( _.data.utxo.map(u => ({txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.data.address.script_hex})))
	                       .to(privateKey.toAddress().toString(), _.data.address.balance - fee)
	                       .addData(lzs.compress('testing compressed data'))
		               .fee(fee)
	                       .sign(privateKey);

    const serialized = transaction.uncheckedSerialize({disableDustOutputs: true});

    const data = new FormData();
    data.append('data', serialized);

    fetch('https://api.blockchair.com/bitcoin-cash/push/transaction', {method: 'POST', body: data})
	  .then(response => response.json())
	  .then(json => console.log('broadcasted', json))
	  .then(() => getAddressData(address))
	  .then(_.mutation(SET_ADDRESS_DATA))
	  .catch(error => console.log('broadcast error', error));

    console.log('serialized', serialized);

    return _;
  },

  SET_ADDRESS_DATA: (_, data) => (_.data = data, _),
  SET_TRANSACTION_DATA: (_, data) => {
    _.transactions = data.data;
    
    _.messages = [];

    for (let id in _.transactions) {
      const transaction = _.transactions[id];
      for (let output of transaction.outputs) {
        if (address.toString() === `bitcoincash:${output.recipient}`) continue;

	const script = bch.Script.fromHex(output.script_hex);

        if (script.isDataOut()) {
          _.messages.unshift(lzs.decompress(script.getData().toString()));
	}
	 //     console.log(script, script.isDataOut(), output, script.toString());
      }
    }

    return _;
  }
};

const privateKey = init();
const address = privateKey.toAddress();

console.log(address.toString());
//console.log(getAddressWithPrefix('qqq').toAddress().toString());

function getAddressWithPrefix (prefix) {
  while (true) {
    const privateKey = new bch.PrivateKey();
    const address = privateKey.toAddress();
    const s = address.toString();

    if (s.indexOf(`bitcoincash:q${prefix}`) === 0) return privateKey;
  }
}

const Addresses = ({}, {privateKey, data}) => (
  <addresses>
    <div>{privateKey.toAddress().toString()}</div>
    <div>{data !== undefined ? data.address.balance : 'waiting for balance'}</div>
  </addresses>
);

const Transaction = ({transaction}, {}) => (
  <transaction>
    {transaction.outputs.map(output => `bitcoincash:${output.recipient}` === privateKey.toAddress().toString() ? undefined : <div>{output.recipient}{lzs.decompress(output.recipient)}</div>)}
  </transaction>
);

const Message = ({message}) => (
  <message>{message}</message>
);

const Viewer = ({}, {messages, transactions, mutation}) => (
  <viewer>
    <button onClick={mutation(SEND_TRANSACTION)}>Send</button>
    {!messages ? undefined : messages.map(message => <Message message={message} />)}
  </viewer>
);

const SideBySide = () => (
  <side-by-side>
    <Addresses />
    <Viewer />
  </side-by-side>
);

const INIT_GUI = ({}, {inited, mutation}) => inited ? <GUI /> : mutation(INIT)(mutation);

const GUI = () => (
  <SideBySide />
);

render(
  INIT_GUI, {
    privateKey 
  }, document.body
);
