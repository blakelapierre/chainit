import { h, render } from 'preact-cycle';
import bch from 'bitcore-lib-cash';
import lzs from 'lz-string';

const roots = ['bitcoincash:qqqqe3jhn7wu6t6nj5gq5z0y3pgsycd8h5jng9r3e7'];

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

function storeTransactionMessage (txid, message) {
  if (localStorage) localStorage.setItem(`T-${txid}`, lzs.compressToUTF16(message));
}

function getTransactionMessage (txid) {
  if (localStorage) return lzs.decompressFromUTF16(localStorage.getItem(`T-${txid}`));
}

function getAddressData (address) {
  return fetch(`https://api.blockchair.com/bitcoin-cash/dashboards/address/${address.toString()}`)
    .then(response => response.json())
    .then(json => json.data[Object.keys(json.data)[0]])
    .catch(error => console.log(error));
}

function getTransactionsG (txids, partialResult) {
  for (let i = 0; i < txids.length; i += 10) {
    partialResult(getTransactions (txids.slice(i, Math.min(txids.length, i + 10))));
  }
}

function getTransactions (txids) {
  return fetch(`https://api.blockchair.com/bitcoin-cash/dashboards/transactions/${txids.join(',')}`)
	  .then(response => response.json())
	  .catch(error => console.log('txids', txids, error));
}

const {INIT, SEND_TRANSACTION, SET_ADDRESS_DATA, SET_TRANSACTION_DATA, SET_NEW_MESSAGE_INPUT, CLEAR_NEW_MESSAGE_INPUT} = {
  INIT: (_, mutation) => {
    _.inited = true;
    _.mutation = mutation;

    _.messages = [];

    getAddressData(roots[0])
      .then(mutation(SET_ADDRESS_DATA))
      .then(() => {
        const g = getTransactionsG(_.data.transactions, function (transactionPromise) {
          transactionPromise.then(mutation(SET_TRANSACTION_DATA));	  
	});
/*	let done;
	do {
          let result = g.next();
	  done = result.done;
	
          mutation(SET_TRANSACTION_DATA)(result.value);
	
	} while (!done);*/
      });
      //.then(() => getTransactions(_.data.transactions))
      //.then(mutation(SET_TRANSACTION_DATA));

    return _;
  },

  SEND_TRANSACTION: (_) => {
    if (_.newMessageInput === '' || _.newMessageInput === undefined) return;
    if (_.compressedNewMessageInput.length > 240) return;

    const fee = 247;
    const transaction = new bch.Transaction()
	                       .from( _.data.utxo.map(u => ({txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.data.address.script_hex})));

    if (roots[0] !== privateKey.toAddress().toString()) transaction.to(roots[0], bch.Transaction.DUST_AMOUNT);
	                       
    transaction.change(privateKey.toAddress().toString())
	       .addData(lzs.compressToUTF16(_.newMessageInput))
	       .fee(fee)
	       .sign(privateKey);

    const serialized = transaction.serialize();

    const data = new FormData();
    data.append('data', serialized);

    fetch('https://api.blockchair.com/bitcoin-cash/push/transaction', {method: 'POST', body: data})
	  .then(response => response.json())
	  .then(json => console.log('broadcasted', json))
	  .then(() => getAddressData(address))
	  .then(_.mutation(SET_ADDRESS_DATA))
	  .then(_.mutation(CLEAR_NEW_MESSAGE_INPUT))
	  .catch(error => console.log('broadcast error', error));

    console.log('serialized', serialized);

    return _;
  },

  SET_ADDRESS_DATA: (_, data) => (_.data = data, _),
  SET_TRANSACTION_DATA: (_, data) => {
    const transactions = data.data;
   // _.transactions = _.transactions.concat(data.data);
    

    for (let id in transactions) {
      const transaction = transactions[id];
      for (let output of transaction.outputs) {
        if (roots[0].toString() === `bitcoincash:${output.recipient}`) continue;
/*
        if (output.script_hex.indexOf('6a') === 0) {
          const message = lzs.decompress(new Buffer(output.script_hex.substr(8), 'hex').toString());
	  storeTransactionMessage(id, message);
	  _.messages.unshift(message);
	}
*/
	
	const script = bch.Script.fromHex(output.script_hex);

	let message;
        if (script.isDataOut()) {
	  for (let chunk of script.chunks) {
            if (chunk.opcodenum === 106) continue;

            message = chunk.buf.toString();
	  }
          
		console.log({message});
	  /*let message = script.getData().toString();
	  if (message.indexOf('4c') === 0) {
            const ss = bch.Script.fromString(message);
	    message = ss.getData().toString();
	  }*/
	  message = lzs.decompressFromUTF16(message);
	  storeTransactionMessage(id, message);
          _.messages.push(message);
		console.log(output.script_hex, script.getData().toString(), message, script);
	}
	     //console.log(script, script.isDataOut(), output, script.toString());
      }
    }

    return _;
  },

  SET_NEW_MESSAGE_INPUT: (_, event) => {
    _.newMessageInput = event.target.value;
    _.compressedNewMessageInput = lzs.compress(_.newMessageInput);

    return _;
  },

  CLEAR_NEW_MESSAGE_INPUT: (_) => {
    _.newMessageInput = '';
    _.compressedNewMessageInput = '';

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
    <div>{data !== undefined ? (data.address.balance === 0 ? 'Send Bitcoin Cash to above address' : data.address.balance) : 'waiting for balance'}</div>
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

const Viewer = ({}, {compressedNewMessageInput, newMessageInput, messages, transactions, mutation}) => (
  <viewer>
    <input type="text" placeholder="new message" value={newMessageInput} onInput={mutation(SET_NEW_MESSAGE_INPUT)} />
    <div>{compressedNewMessageInput}</div>
    <div>{compressedNewMessageInput ? compressedNewMessageInput.length : '0'} / 240</div>
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
