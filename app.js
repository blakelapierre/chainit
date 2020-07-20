(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _preactCycle = require('preact-cycle');

var _bitcoreLibCash = require('bitcore-lib-cash');

var _bitcoreLibCash2 = _interopRequireDefault(_bitcoreLibCash);

var _lzString = require('lz-string');

var _lzString2 = _interopRequireDefault(_lzString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectDestructuringEmpty(obj) { if (obj == null) throw new TypeError("Cannot destructure undefined"); }

var roots = ['bitcoincash:qqqqe3jhn7wu6t6nj5gq5z0y3pgsycd8h5jng9r3e7'];

function init() {
  if (!localStorage) {
    alert('No localStorage!!!! new key will not be saved!');
  } else {
    var cWIF = localStorage.getItem('privatekey');

    if (cWIF) return new _bitcoreLibCash2.default.PrivateKey.fromWIF(_lzString2.default.decompressFromUTF16(cWIF));

    var _privateKey = getAddressWithPrefix('qqq');

    localStorage.setItem('privatekey', _lzString2.default.compressToUTF16(_privateKey.toWIF()));

    return _privateKey;
  }
}

function createChannel() {
  if (!localStorage) return alert('No localStorage!!! new key will not be saved!');

  var privateKey = getAddressWithPrefix('qqq');

  var channelKeyCount = parseInt(localStorage.getItem('channelKeyCount') || '0') + 1;
  localStorage.setItem('channelKeyCount', channelKeyCount);
  localStorage.setItem('channelKey-' + channelKeyCount, _lzString2.default.compressToUTF16(privateKey.toWIF()));

  return privateKey;
}

function storeTransactionMessage(txid, message) {
  if (localStorage) localStorage.setItem('T-' + txid, _lzString2.default.compressToUTF16(message));
}

function getTransactionMessage(txid) {
  if (localStorage) return _lzString2.default.decompressFromUTF16(localStorage.getItem('T-' + txid));
}

function getAddressData(address) {
  return fetch('https://api.blockchair.com/bitcoin-cash/dashboards/address/' + address.toString()).then(function (response) {
    return response.json();
  }).then(function (json) {
    return json.data[Object.keys(json.data)[0]];
  }).catch(function (error) {
    return console.log(error);
  });
}

function getTransactionsG(txids, partialResult) {
  var _txids$reduce = txids.reduce(function (agg, txid) {
    var message = getTransactionMessage(txid);

    if (message) agg.found[txid] = message;else agg.remaining.push(txid);

    return agg;
  }, { found: {}, remaining: [] }),
      found = _txids$reduce.found,
      remaining = _txids$reduce.remaining;

  partialResult(new Promise(function (resolve) {
    return resolve(found);
  }));

  for (var i = 0; i < remaining.length; i += 10) {
    partialResult(getTransactions(remaining.slice(i, Math.min(remaining.length, i + 10))));
  }
}

function getTransactions(txids) {
  return fetch('https://api.blockchair.com/bitcoin-cash/dashboards/transactions/' + txids.join(',')).then(function (response) {
    return response.json();
  }).catch(function (error) {
    return console.log('txids', txids, error);
  });
}

function failToNext(fnList, context) {}

function sendTransaction(serialized) {
  //return sendTransactionToBlockchair_com(serialized);
  //return sendTransactionToBitcoin_com(serialized);
  return sendTransactionToBitcoin_com(serialized).then(function (response) {
    if (response.ok) return response;

    return sendTransactionToBlockchair_com(serialized);
  }).then(function (response) {
    return response.json();
  }).then(function (json) {
    return console.log('broadcaster', json);
  }).catch(function (e) {
    return sendTransactionToBlockchair_com(serialized);
  });
}

function sendTransactionToBlockchair_com(serialized) {
  var data = new FormData();
  data.append('data', serialized);

  return fetch('https://api.blockchair.com/bitcoin-cash/push/transaction', { method: 'POST', body: data });
  /*.then(response => response.json())
  .then(json => console.log('broadcasted', json));*/
}

function sendTransactionToBitcoin_com(serialized) {
  return fetch('https://rest.bitcoin.com/v2/rawtransactions/sendRawTransaction/' + serialized);
  /*.then(response => response.json())
  .then(json => console.log('broadcasted', json));*/
}

function createDataTransaction(to, privateKey, data, fee, utxos) {
  var transaction = new _bitcoreLibCash2.default.Transaction(),
      address = privateKey.toAddress().toString();

  transaction.from(utxos);

  if (to !== address) {
    transaction.to(to, _bitcoreLibCash2.default.Transaction.DUST_AMOUNT);
  }

  transaction.addData(data).change(address).fee(fee).sign(privateKey);

  return transaction;
}

function loadChannelMessages(_) {
  var mutation = _.mutation;
  var channel = _.selectedChannel;
  _.messages = {};
  _.messages[channel] = _.messages[channel] || [];

  getAddressData(channel).then(mutation(SET_ADDRESS_DATA, channel)).then(function () {
    getTransactionsG(_.addressData[channel].transactions, function (transactionPromise) {
      transactionPromise.then(mutation(SET_TRANSACTION_DATA, channel));
    });
  });
}

function runAndSetInterval(fn, t) {
  fn();
  return setInterval(fn, t);
}

var _INIT$SEND_TRANSACTIO = {
  INIT: function INIT(_, mutation) {
    _.inited = true;
    _.mutation = mutation;

    _.messages = {};
    _.channels = {};

    _.channels[roots[0]] = { name: 'root', id: roots[0] };

    _.addressData = {};

    _.refreshInterval = 30 * 1000;

    _.refreshTimerId = runAndSetInterval(function () {
      getAddressData(address.toString()).then(mutation(SET_ADDRESS_DATA, address.toString()));

      loadChannelMessages(_, mutation);
    }, _.refreshInterval);

    return _;
  },

  SEND_TRANSACTION: function SEND_TRANSACTION(_) {
    if (_.newMessageInput === '' || _.newMessageInput === undefined) return;
    if (_.compressedNewMessageInput.length > 240) return;

    var utxos = _.addressData[address.toString()].utxo.map(function (u) {
      return { txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.addressData[address.toString()].address.script_hex };
    });

    if (utxos.length === 0) {
      alert('no utxos!!');
      return _;
    }

    var fee = 284;
    var transaction = createDataTransaction(_.selectedChannel, privateKey, _lzString2.default.compressToUTF16(_.newMessageInput), fee, utxos);
    /*
    const transaction = new bch.Transaction()
                       .from( _.data.utxo.map(u => ({txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.data.address.script_hex})));
    if (roots[0] !== privateKey.toAddress().toString()) {
     transaction.to(roots[0], bch.Transaction.DUST_AMOUNT);
     console.log('different key', roots[0], privateKey.toAddress().toString());
    }
    transaction.change(privateKey.toAddress().toString())
       .addData(lzs.compressToUTF16(_.newMessageInput))
       .fee(fee)
       .sign(privateKey);
    */
    var serialized = transaction.serialize({ disableDustOutputs: true });

    sendTransaction(serialized).then(function () {
      return getAddressData(address);
    }).then(_.mutation(SET_ADDRESS_DATA)).then(_.mutation(CLEAR_NEW_MESSAGE_INPUT)).catch(function (error) {
      return console.log('broadcast error', error);
    });

    console.log('serialized', serialized);

    return _;
  },

  CREATE_NEW_CHANNEL: function CREATE_NEW_CHANNEL(_, data) {
    var name = prompt('New channel name');

    if (name && name !== '') {
      //const channelKey = getAddressWithPrefix('qqq');
      var channelKey = createChannel();
      var utxos = _.addressData[address.toString()].utxo.map(function (u) {
        return { txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.addressData[address.toString()].address.script_hex };
      });

      if (utxos.length === 0) return new Error('not enough utxos (0)');

      sendTransaction(createDataTransaction(roots[0], privateKey, _lzString2.default.compressToUTF16(JSON.stringify([channelKey.toAddress().toString(), name])), 285, utxos)).then(function (result) {
        return result.json();
      }).then(function (json) {
        return console.log('broadcasted create', result);
      }).catch(function (error) {
        return console.log('broadcast create error', error);
      });
    }
  },

  SET_ADDRESS_DATA: function SET_ADDRESS_DATA(_, address, data) {
    _.addressData[address] = data;
    return _;
  },

  SET_TRANSACTION_DATA: function SET_TRANSACTION_DATA(_, channel, data) {
    if (data.data) {
      var transactions = data.data;
      // _.transactions = _.transactions.concat(data.data);

      for (var id in transactions) {
        var transaction = transactions[id];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = transaction.outputs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var output = _step.value;

            //if (roots[0].toString() === `bitcoincash:${output.recipient}`) continue;
            if (_.selectedChannel.toString() === 'bitcoincash:' + output.recipient) continue;
            /*
                    if (output.script_hex.indexOf('6a') === 0) {
                      const message = lzs.decompress(new Buffer(output.script_hex.substr(8), 'hex').toString());
            	  storeTransactionMessage(id, message);
            	  _.messages.unshift(message);
            	}
            */

            var script = _bitcoreLibCash2.default.Script.fromHex(output.script_hex);

            var message = void 0;
            if (script.isDataOut()) {
              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = script.chunks[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var chunk = _step2.value;

                  if (chunk.opcodenum === 106) continue;

                  message = chunk.buf.toString();
                }
              } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                  }
                } finally {
                  if (_didIteratorError2) {
                    throw _iteratorError2;
                  }
                }
              }

              var decompressedMessage = _lzString2.default.decompressFromUTF16(message);

              try {
                var _data = JSON.parse(decompressedMessage);
                _.channels[_data[0]] = { name: _data[1], id: _data[0] };
                //_.channels.push([data[0], data[1]]);
              } catch (e) {
                _.messages[channel].push(decompressedMessage);
              }

              storeTransactionMessage(id, decompressedMessage);
            }
          } //console.log(script, script.isDataOut(), output, script.toString());
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    } else {
      for (var txid in data) {
        try {
          var d = JSON.parse(data[txid]);
          _.channels[d[0]] = { name: d[1], id: d[0] };
          //_.channels.push([d[0], d[1]]);
        } catch (e) {
          _.messages[channel].push(data[txid]);
        }
      }
    }

    return _;
  },

  SET_NEW_MESSAGE_INPUT: function SET_NEW_MESSAGE_INPUT(_, event) {
    _.newMessageInput = event.target.value;
    _.compressedNewMessageInput = _lzString2.default.compress(_.newMessageInput);

    return _;
  },

  CLEAR_NEW_MESSAGE_INPUT: function CLEAR_NEW_MESSAGE_INPUT(_) {
    _.newMessageInput = '';
    _.compressedNewMessageInput = '';

    return _;
  },

  CLICKED_CHANNEL: function CLICKED_CHANNEL(_, channel) {
    _.selectedChannel = channel;
    loadChannelMessages(_);
    return _;
  },

  EXPORT_KEY: function EXPORT_KEY(_) {
    prompt('Copy compressed key!', _lzString2.default.compressToUTF16(privateKey.toWIF()));
  },

  IMPORT_KEY: function IMPORT_KEY(_) {
    var cWIF = prompt('Enter compressed key');
    var key = new _bitcoreLibCash2.default.PrivateKey.fromWIF(_lzString2.default.decompressFromUTF16(cWIF));

    if (localStorage) {
      localStorage.setItem('oldprivatekey', localStorage.getItem('privatekey'));
      localStorage.setItem('privatekey', cWIF);
    }

    privateKey = key;
    address = privateKey.toAddress();
  }
},
    INIT = _INIT$SEND_TRANSACTIO.INIT,
    SEND_TRANSACTION = _INIT$SEND_TRANSACTIO.SEND_TRANSACTION,
    CREATE_NEW_CHANNEL = _INIT$SEND_TRANSACTIO.CREATE_NEW_CHANNEL,
    SET_ADDRESS_DATA = _INIT$SEND_TRANSACTIO.SET_ADDRESS_DATA,
    SET_TRANSACTION_DATA = _INIT$SEND_TRANSACTIO.SET_TRANSACTION_DATA,
    SET_NEW_MESSAGE_INPUT = _INIT$SEND_TRANSACTIO.SET_NEW_MESSAGE_INPUT,
    CLEAR_NEW_MESSAGE_INPUT = _INIT$SEND_TRANSACTIO.CLEAR_NEW_MESSAGE_INPUT,
    CLICKED_CHANNEL = _INIT$SEND_TRANSACTIO.CLICKED_CHANNEL,
    IMPORT_KEY = _INIT$SEND_TRANSACTIO.IMPORT_KEY,
    EXPORT_KEY = _INIT$SEND_TRANSACTIO.EXPORT_KEY;


var privateKey = init();
var address = privateKey.toAddress();

console.log(address.toString());
//console.log(getAddressWithPrefix('qqq').toAddress().toString());

function getAddressWithPrefix(prefix) {
  while (true) {
    var _privateKey2 = new _bitcoreLibCash2.default.PrivateKey();
    var _address = _privateKey2.toAddress();
    var s = _address.toString();

    if (s.indexOf('bitcoincash:q' + prefix) === 0) return _privateKey2;
  }
}

var Addresses = function Addresses(_ref, _ref2) {
  var privateKey = _ref2.privateKey,
      channels = _ref2.channels,
      addressData = _ref2.addressData,
      data = _ref2.data,
      mutation = _ref2.mutation;

  _objectDestructuringEmpty(_ref);

  return (0, _preactCycle.h)(
    'addresses',
    null,
    (0, _preactCycle.h)(
      'div',
      null,
      privateKey.toAddress().toString()
    ),
    (0, _preactCycle.h)(
      'div',
      null,
      addressData[privateKey.toAddress().toString()] !== undefined ? addressData[privateKey.toAddress().toString()].address.balance === 0 ? 'Send Bitcoin Cash to above address' : addressData[privateKey.toAddress().toString()].address.balance : 'waiting for balance'
    ),
    (0, _preactCycle.h)(
      'button',
      { onClick: mutation(EXPORT_KEY) },
      'Export Key'
    ),
    (0, _preactCycle.h)(
      'button',
      { onClick: mutation(IMPORT_KEY) },
      'Import Key'
    ),
    !channels ? undefined : Object.keys(channels).map(function (channel) {
      return (0, _preactCycle.h)(Channel, { channel: channels[channel] });
    }),
    (0, _preactCycle.h)(
      'button',
      { onClick: mutation(CREATE_NEW_CHANNEL) },
      'Create New Channel'
    )
  );
};

var Transaction = function Transaction(_ref3, _ref4) {
  var transaction = _ref3.transaction;

  _objectDestructuringEmpty(_ref4);

  return (0, _preactCycle.h)(
    'transaction',
    null,
    transaction.outputs.map(function (output) {
      return 'bitcoincash:' + output.recipient === privateKey.toAddress().toString() ? undefined : (0, _preactCycle.h)(
        'div',
        null,
        output.recipient,
        _lzString2.default.decompress(output.recipient)
      );
    })
  );
};

var Message = function Message(_ref5) {
  var message = _ref5.message;
  return (0, _preactCycle.h)(
    'message',
    null,
    message
  );
};

var Channel = function Channel(_ref6, _ref7) {
  var channel = _ref6.channel;
  var mutation = _ref7.mutation;
  return (0, _preactCycle.h)(
    'channel',
    { title: channel.id, onClick: mutation(CLICKED_CHANNEL, channel.id) },
    channel.name
  );
};

var Viewer = function Viewer(_ref8, _ref9) {
  var channel = _ref8.channel;
  var channelBalance = _ref9.channelBalance,
      compressedNewMessageInput = _ref9.compressedNewMessageInput,
      newMessageInput = _ref9.newMessageInput,
      messages = _ref9.messages,
      transactions = _ref9.transactions,
      channels = _ref9.channels,
      addressData = _ref9.addressData,
      mutation = _ref9.mutation;
  return (0, _preactCycle.h)(
    'viewer',
    null,
    (0, _preactCycle.h)(
      'channel-id',
      null,
      'Channel Address: ',
      channel
    ),
    (0, _preactCycle.h)(
      'channel-balance',
      null,
      'Channel Balance: ',
      addressData[channel] ? addressData[channel].address.balance : 'waiting for balance'
    ),
    (0, _preactCycle.h)(
      'messages',
      null,
      !messages ? undefined : messages[channel].map(function (message) {
        return (0, _preactCycle.h)(Message, { message: message });
      })
    ),
    (0, _preactCycle.h)('textarea', { value: newMessageInput, onInput: mutation(SET_NEW_MESSAGE_INPUT) }),
    (0, _preactCycle.h)(
      'button',
      { onClick: mutation(SEND_TRANSACTION) },
      'Send'
    ),
    (0, _preactCycle.h)(
      'div',
      null,
      compressedNewMessageInput
    ),
    (0, _preactCycle.h)(
      'div',
      null,
      compressedNewMessageInput ? new Blob([compressedNewMessageInput]).size : '0',
      ' / 240'
    )
  );
};

var SideBySide = function SideBySide(_ref10) {
  var selectedChannel = _ref10.selectedChannel;
  return (0, _preactCycle.h)(
    'side-by-side',
    null,
    (0, _preactCycle.h)(Addresses, null),
    (0, _preactCycle.h)(Viewer, { channel: selectedChannel })
  );
};

var INIT_GUI = function INIT_GUI(_ref11, _ref12) {
  var inited = _ref12.inited,
      selectedChannel = _ref12.selectedChannel,
      mutation = _ref12.mutation;

  _objectDestructuringEmpty(_ref11);

  return inited ? (0, _preactCycle.h)(GUI, { selectedChannel: selectedChannel }) : mutation(INIT)(mutation);
};

var GUI = function GUI(_ref13) {
  var selectedChannel = _ref13.selectedChannel;
  return (0, _preactCycle.h)(SideBySide, { selectedChannel: selectedChannel });
};

(0, _preactCycle.render)(INIT_GUI, {
  selectedChannel: roots[0],
  privateKey: privateKey
}, document.body);

},{"bitcore-lib-cash":"bitcore-lib-cash","lz-string":"lz-string","preact-cycle":"preact-cycle"}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUVBLElBQU0sUUFBUSxDQUFDLHdEQUFELENBQWQ7O0FBRUEsU0FBUyxJQUFULEdBQWdCO0FBQ2QsTUFBSSxDQUFDLFlBQUwsRUFBbUI7QUFDakIsVUFBTSxnREFBTjtBQUNELEdBRkQsTUFHSztBQUNILFFBQU0sT0FBTyxhQUFhLE9BQWIsQ0FBcUIsWUFBckIsQ0FBYjs7QUFFQSxRQUFJLElBQUosRUFBVSxPQUFPLElBQUkseUJBQUksVUFBSixDQUFlLE9BQW5CLENBQTJCLG1CQUFJLG1CQUFKLENBQXdCLElBQXhCLENBQTNCLENBQVA7O0FBRVYsUUFBTSxjQUFhLHFCQUFxQixLQUFyQixDQUFuQjs7QUFFQSxpQkFBYSxPQUFiLENBQXFCLFlBQXJCLEVBQW1DLG1CQUFJLGVBQUosQ0FBb0IsWUFBVyxLQUFYLEVBQXBCLENBQW5DOztBQUVBLFdBQU8sV0FBUDtBQUNEO0FBQ0Y7O0FBRUQsU0FBUyxhQUFULEdBQTBCO0FBQ3hCLE1BQUksQ0FBQyxZQUFMLEVBQW1CLE9BQU8sTUFBTSwrQ0FBTixDQUFQOztBQUVuQixNQUFNLGFBQWEscUJBQXFCLEtBQXJCLENBQW5COztBQUVBLE1BQU0sa0JBQWtCLFNBQVMsYUFBYSxPQUFiLHVCQUEyQyxHQUFwRCxJQUEyRCxDQUFuRjtBQUNBLGVBQWEsT0FBYixvQkFBd0MsZUFBeEM7QUFDQSxlQUFhLE9BQWIsaUJBQW1DLGVBQW5DLEVBQXNELG1CQUFJLGVBQUosQ0FBb0IsV0FBVyxLQUFYLEVBQXBCLENBQXREOztBQUVBLFNBQU8sVUFBUDtBQUNEOztBQUVELFNBQVMsdUJBQVQsQ0FBa0MsSUFBbEMsRUFBd0MsT0FBeEMsRUFBaUQ7QUFDL0MsTUFBSSxZQUFKLEVBQWtCLGFBQWEsT0FBYixRQUEwQixJQUExQixFQUFrQyxt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dEI7QUFBbkMsS0FIRjtBQUlFLHNDQUFVLE9BQU8sZUFBakIsRUFBa0MsU0FBUyxTQUFTLHFCQUFULENBQTNDLEdBSkY7QUFLRTtBQUFBO0FBQUEsUUFBUSxTQUFTLFNBQVMsZ0JBQVQsQ0FBakI7QUFBQTtBQUFBLEtBTEY7QUFNRTtBQUFBO0FBQUE7QUFBTTtBQUFOLEtBTkY7QUFPRTtBQUFBO0FBQUE7QUFBTSxrQ0FBNEIsSUFBSSxJQUFKLENBQVMsQ0FBQyx5QkFBRCxDQUFULEVBQXNDLElBQWxFLEdBQXlFLEdBQS9FO0FBQUE7QUFBQTtBQVBGLEdBRGE7QUFBQSxDQUFmOztBQVlBLElBQU0sYUFBYSxTQUFiLFVBQWE7QUFBQSxNQUFFLGVBQUYsVUFBRSxlQUFGO0FBQUEsU0FDakI7QUFBQTtBQUFBO0FBQ0Usd0JBQUMsU0FBRCxPQURGO0FBRUUsd0JBQUMsTUFBRCxJQUFRLFNBQVMsZUFBakI7QUFGRixHQURpQjtBQUFBLENBQW5COztBQU9BLElBQU0sV0FBVyxTQUFYLFFBQVc7QUFBQSxNQUFNLE1BQU4sVUFBTSxNQUFOO0FBQUEsTUFBYyxlQUFkLFVBQWMsZUFBZDtBQUFBLE1BQStCLFFBQS9CLFVBQStCLFFBQS9COztBQUFBOztBQUFBLFNBQTZDLFNBQVMsb0JBQUMsR0FBRCxJQUFLLGlCQUFpQixlQUF0QixHQUFULEdBQXFELFNBQVMsSUFBVCxFQUFlLFFBQWYsQ0FBbEc7QUFBQSxDQUFqQjs7QUFFQSxJQUFNLE1BQU0sU0FBTixHQUFNO0FBQUEsTUFBRSxlQUFGLFVBQUUsZUFBRjtBQUFBLFNBQ1Ysb0JBQUMsVUFBRCxJQUFZLGlCQUFpQixlQUE3QixHQURVO0FBQUEsQ0FBWjs7QUFJQSx5QkFDRSxRQURGLEVBQ1k7QUFDUixtQkFBaUIsTUFBTSxDQUFOLENBRFQ7QUFFUjtBQUZRLENBRFosRUFJSyxTQUFTLElBSmQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHsgaCwgcmVuZGVyIH0gZnJvbSAncHJlYWN0LWN5Y2xlJztcbmltcG9ydCBiY2ggZnJvbSAnYml0Y29yZS1saWItY2FzaCc7XG5pbXBvcnQgbHpzIGZyb20gJ2x6LXN0cmluZyc7XG5cbmNvbnN0IHJvb3RzID0gWydiaXRjb2luY2FzaDpxcXFxZTNqaG43d3U2dDZuajVncTV6MHkzcGdzeWNkOGg1am5nOXIzZTcnXTtcblxuZnVuY3Rpb24gaW5pdCgpIHtcbiAgaWYgKCFsb2NhbFN0b3JhZ2UpIHtcbiAgICBhbGVydCgnTm8gbG9jYWxTdG9yYWdlISEhISBuZXcga2V5IHdpbGwgbm90IGJlIHNhdmVkIScpO1xuICB9XG4gIGVsc2Uge1xuICAgIGNvbnN0IGNXSUYgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncHJpdmF0ZWtleScpO1xuXG4gICAgaWYgKGNXSUYpIHJldHVybiBuZXcgYmNoLlByaXZhdGVLZXkuZnJvbVdJRihsenMuZGVjb21wcmVzc0Zyb21VVEYxNihjV0lGKSk7XG5cbiAgICBjb25zdCBwcml2YXRlS2V5ID0gZ2V0QWRkcmVzc1dpdGhQcmVmaXgoJ3FxcScpO1xuXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3ByaXZhdGVrZXknLCBsenMuY29tcHJlc3NUb1VURjE2KHByaXZhdGVLZXkudG9XSUYoKSkpO1xuXG4gICAgcmV0dXJuIHByaXZhdGVLZXk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhbm5lbCAoKSB7XG4gIGlmICghbG9jYWxTdG9yYWdlKSByZXR1cm4gYWxlcnQoJ05vIGxvY2FsU3RvcmFnZSEhISBuZXcga2V5IHdpbGwgbm90IGJlIHNhdmVkIScpO1xuXG4gIGNvbnN0IHByaXZhdGVLZXkgPSBnZXRBZGRyZXNzV2l0aFByZWZpeCgncXFxJyk7XG5cbiAgY29uc3QgY2hhbm5lbEtleUNvdW50ID0gcGFyc2VJbnQobG9jYWxTdG9yYWdlLmdldEl0ZW0oYGNoYW5uZWxLZXlDb3VudGApIHx8ICcwJykgKyAxO1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgY2hhbm5lbEtleUNvdW50YCwgY2hhbm5lbEtleUNvdW50KTtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oYGNoYW5uZWxLZXktJHtjaGFubmVsS2V5Q291bnR9YCwgbHpzLmNvbXByZXNzVG9VVEYxNihwcml2YXRlS2V5LnRvV0lGKCkpKTtcbiAgXG4gIHJldHVybiBwcml2YXRlS2V5O1xufVxuXG5mdW5jdGlvbiBzdG9yZVRyYW5zYWN0aW9uTWVzc2FnZSAodHhpZCwgbWVzc2FnZSkge1xuICBpZiAobG9jYWxTdG9yYWdlKSBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgVC0ke3R4aWR9YCwgbHpzLmNvbXByZXNzVG9VVEYxNihtZXNzYWdlKSk7XG59XG5cbmZ1bmN0aW9uIGdldFRyYW5zYWN0aW9uTWVzc2FnZSAodHhpZCkge1xuICBpZiAobG9jYWxTdG9yYWdlKSByZXR1cm4gbHpzLmRlY29tcHJlc3NGcm9tVVRGMTYobG9jYWxTdG9yYWdlLmdldEl0ZW0oYFQtJHt0eGlkfWApKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWRkcmVzc0RhdGEgKGFkZHJlc3MpIHtcbiAgcmV0dXJuIGZldGNoKGBodHRwczovL2FwaS5ibG9ja2NoYWlyLmNvbS9iaXRjb2luLWNhc2gvZGFzaGJvYXJkcy9hZGRyZXNzLyR7YWRkcmVzcy50b1N0cmluZygpfWApXG4gICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgIC50aGVuKGpzb24gPT4ganNvbi5kYXRhW09iamVjdC5rZXlzKGpzb24uZGF0YSlbMF1dKVxuICAgIC5jYXRjaChlcnJvciA9PiBjb25zb2xlLmxvZyhlcnJvcikpO1xufVxuXG5mdW5jdGlvbiBnZXRUcmFuc2FjdGlvbnNHICh0eGlkcywgcGFydGlhbFJlc3VsdCkge1xuICBjb25zdCB7Zm91bmQsIHJlbWFpbmluZ30gPSB0eGlkcy5yZWR1Y2UoKGFnZywgdHhpZCkgPT4ge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBnZXRUcmFuc2FjdGlvbk1lc3NhZ2UodHhpZCk7XG5cbiAgICBpZiAobWVzc2FnZSkgYWdnLmZvdW5kW3R4aWRdID0gbWVzc2FnZTtcbiAgICBlbHNlIGFnZy5yZW1haW5pbmcucHVzaCh0eGlkKTtcblxuICAgIHJldHVybiBhZ2c7XG4gIH0sIHtmb3VuZDoge30sIHJlbWFpbmluZzogW119KTtcblxuICBwYXJ0aWFsUmVzdWx0KG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVzb2x2ZShmb3VuZCkpKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbWFpbmluZy5sZW5ndGg7IGkgKz0gMTApIHtcbiAgICBwYXJ0aWFsUmVzdWx0KGdldFRyYW5zYWN0aW9ucyAocmVtYWluaW5nLnNsaWNlKGksIE1hdGgubWluKHJlbWFpbmluZy5sZW5ndGgsIGkgKyAxMCkpKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VHJhbnNhY3Rpb25zICh0eGlkcykge1xuICByZXR1cm4gZmV0Y2goYGh0dHBzOi8vYXBpLmJsb2NrY2hhaXIuY29tL2JpdGNvaW4tY2FzaC9kYXNoYm9hcmRzL3RyYW5zYWN0aW9ucy8ke3R4aWRzLmpvaW4oJywnKX1gKVxuXHQgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcblx0ICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5sb2coJ3R4aWRzJywgdHhpZHMsIGVycm9yKSk7XG59XG5cbmZ1bmN0aW9uIGZhaWxUb05leHQgKGZuTGlzdCwgY29udGV4dCkge1xuICBcbn1cblxuZnVuY3Rpb24gc2VuZFRyYW5zYWN0aW9uIChzZXJpYWxpemVkKSB7XG4gIC8vcmV0dXJuIHNlbmRUcmFuc2FjdGlvblRvQmxvY2tjaGFpcl9jb20oc2VyaWFsaXplZCk7XG4gIC8vcmV0dXJuIHNlbmRUcmFuc2FjdGlvblRvQml0Y29pbl9jb20oc2VyaWFsaXplZCk7XG4gIHJldHVybiBzZW5kVHJhbnNhY3Rpb25Ub0JpdGNvaW5fY29tKHNlcmlhbGl6ZWQpXG5cdCAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHJldHVybiByZXNwb25zZTtcblxuXHQgICAgIHJldHVybiBzZW5kVHJhbnNhY3Rpb25Ub0Jsb2NrY2hhaXJfY29tKHNlcmlhbGl6ZWQpO1xuXHQgICB9KVxuXHQgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG5cdCAgIC50aGVuKGpzb24gPT4gY29uc29sZS5sb2coJ2Jyb2FkY2FzdGVyJywganNvbikpXG5cdCAgIC5jYXRjaChlID0+IHNlbmRUcmFuc2FjdGlvblRvQmxvY2tjaGFpcl9jb20oc2VyaWFsaXplZCkpO1xufVxuXG5mdW5jdGlvbiBzZW5kVHJhbnNhY3Rpb25Ub0Jsb2NrY2hhaXJfY29tIChzZXJpYWxpemVkKSB7XG4gIGNvbnN0IGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgZGF0YS5hcHBlbmQoJ2RhdGEnLCBzZXJpYWxpemVkKTtcblxuICByZXR1cm4gZmV0Y2goJ2h0dHBzOi8vYXBpLmJsb2NrY2hhaXIuY29tL2JpdGNvaW4tY2FzaC9wdXNoL3RyYW5zYWN0aW9uJywge21ldGhvZDogJ1BPU1QnLCBib2R5OiBkYXRhfSk7XG5cdCAgICAvKi50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcblx0ICAgIC50aGVuKGpzb24gPT4gY29uc29sZS5sb2coJ2Jyb2FkY2FzdGVkJywganNvbikpOyovXG59XG5cbmZ1bmN0aW9uIHNlbmRUcmFuc2FjdGlvblRvQml0Y29pbl9jb20gKHNlcmlhbGl6ZWQpIHtcbiAgcmV0dXJuIGZldGNoKGBodHRwczovL3Jlc3QuYml0Y29pbi5jb20vdjIvcmF3dHJhbnNhY3Rpb25zL3NlbmRSYXdUcmFuc2FjdGlvbi8ke3NlcmlhbGl6ZWR9YCk7XG4gICAgICAgICAgIC8qLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuXHQgICAudGhlbihqc29uID0+IGNvbnNvbGUubG9nKCdicm9hZGNhc3RlZCcsIGpzb24pKTsqL1xufVxuXG5mdW5jdGlvbiBjcmVhdGVEYXRhVHJhbnNhY3Rpb24gKHRvLCBwcml2YXRlS2V5LCBkYXRhLCBmZWUsIHV0eG9zKSB7XG4gIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IGJjaC5UcmFuc2FjdGlvbigpLFxuICAgICAgICBhZGRyZXNzID0gcHJpdmF0ZUtleS50b0FkZHJlc3MoKS50b1N0cmluZygpO1xuXG4gIHRyYW5zYWN0aW9uLmZyb20odXR4b3MpO1xuXG4gIGlmICh0byAhPT0gYWRkcmVzcykge1xuICAgIHRyYW5zYWN0aW9uLnRvKHRvLCBiY2guVHJhbnNhY3Rpb24uRFVTVF9BTU9VTlQpO1xuICB9XG5cbiAgdHJhbnNhY3Rpb24uYWRkRGF0YShkYXRhKVxuXHQgICAgIC5jaGFuZ2UoYWRkcmVzcylcblx0ICAgICAuZmVlKGZlZSlcblx0ICAgICAuc2lnbihwcml2YXRlS2V5KTtcbiAgXG4gIHJldHVybiB0cmFuc2FjdGlvbjtcbn1cblxuZnVuY3Rpb24gbG9hZENoYW5uZWxNZXNzYWdlcyhfKSB7XG4gIGNvbnN0IG11dGF0aW9uID0gXy5tdXRhdGlvbjtcbiAgY29uc3QgY2hhbm5lbCA9IF8uc2VsZWN0ZWRDaGFubmVsO1xuICBfLm1lc3NhZ2VzID0ge307XG4gIF8ubWVzc2FnZXNbY2hhbm5lbF0gPSBfLm1lc3NhZ2VzW2NoYW5uZWxdIHx8IFtdO1xuICAgIFxuICBnZXRBZGRyZXNzRGF0YShjaGFubmVsKVxuICAgIC50aGVuKG11dGF0aW9uKFNFVF9BRERSRVNTX0RBVEEsIGNoYW5uZWwpKVxuICAgIC50aGVuKCgpID0+IHtcbiAgICAgIGdldFRyYW5zYWN0aW9uc0coXy5hZGRyZXNzRGF0YVtjaGFubmVsXS50cmFuc2FjdGlvbnMsIGZ1bmN0aW9uICh0cmFuc2FjdGlvblByb21pc2UpIHtcbiAgICAgICAgdHJhbnNhY3Rpb25Qcm9taXNlLnRoZW4obXV0YXRpb24oU0VUX1RSQU5TQUNUSU9OX0RBVEEsIGNoYW5uZWwpKTtcdCAgXG4gICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuQW5kU2V0SW50ZXJ2YWwoZm4sIHQpIHtcbiAgZm4oKTtcbiAgcmV0dXJuIHNldEludGVydmFsKGZuLCB0KTtcbn1cblxuY29uc3Qge1xuICBJTklULCBcbiAgU0VORF9UUkFOU0FDVElPTiwgXG4gIENSRUFURV9ORVdfQ0hBTk5FTCxcbiAgU0VUX0FERFJFU1NfREFUQSwgXG4gIFNFVF9UUkFOU0FDVElPTl9EQVRBLCBcbiAgU0VUX05FV19NRVNTQUdFX0lOUFVULCBcbiAgQ0xFQVJfTkVXX01FU1NBR0VfSU5QVVQsXG4gIENMSUNLRURfQ0hBTk5FTCxcbiAgSU1QT1JUX0tFWSxcbiAgRVhQT1JUX0tFWVxufSA9IHtcbiAgSU5JVDogKF8sIG11dGF0aW9uKSA9PiB7XG4gICAgXy5pbml0ZWQgPSB0cnVlO1xuICAgIF8ubXV0YXRpb24gPSBtdXRhdGlvbjtcblxuICAgIF8ubWVzc2FnZXMgPSB7fTtcbiAgICBfLmNoYW5uZWxzID0ge307XG5cbiAgICBfLmNoYW5uZWxzW3Jvb3RzWzBdXSA9IHtuYW1lOiAncm9vdCcsIGlkOiByb290c1swXX07XG5cbiAgICBfLmFkZHJlc3NEYXRhID0ge307XG5cbiAgICBfLnJlZnJlc2hJbnRlcnZhbCA9IDMwICogMTAwMDtcblxuICAgIF8ucmVmcmVzaFRpbWVySWQgPSBydW5BbmRTZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBnZXRBZGRyZXNzRGF0YShhZGRyZXNzLnRvU3RyaW5nKCkpXG4gICAgICAgIC50aGVuKG11dGF0aW9uKFNFVF9BRERSRVNTX0RBVEEsIGFkZHJlc3MudG9TdHJpbmcoKSkpO1xuICAgICAgXG4gICAgICBsb2FkQ2hhbm5lbE1lc3NhZ2VzKF8sIG11dGF0aW9uKTtcbiAgICB9LCBfLnJlZnJlc2hJbnRlcnZhbCk7XG5cbiAgICByZXR1cm4gXztcbiAgfSxcblxuICBTRU5EX1RSQU5TQUNUSU9OOiAoXykgPT4ge1xuICAgIGlmIChfLm5ld01lc3NhZ2VJbnB1dCA9PT0gJycgfHwgXy5uZXdNZXNzYWdlSW5wdXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgIGlmIChfLmNvbXByZXNzZWROZXdNZXNzYWdlSW5wdXQubGVuZ3RoID4gMjQwKSByZXR1cm47XG5cbiAgICBjb25zdCB1dHhvcyA9IF8uYWRkcmVzc0RhdGFbYWRkcmVzcy50b1N0cmluZygpXS51dHhvLm1hcCh1ID0+ICh7dHhJZDogdS50cmFuc2FjdGlvbl9oYXNoLCBvdXRwdXRJbmRleDogdS5pbmRleCwgc2F0b3NoaXM6IHUudmFsdWUsIHNjcmlwdDogXy5hZGRyZXNzRGF0YVthZGRyZXNzLnRvU3RyaW5nKCldLmFkZHJlc3Muc2NyaXB0X2hleH0pKTtcbiAgICBcbiAgICBpZiAodXR4b3MubGVuZ3RoID09PSAwKSB7XG4gICAgICBhbGVydCgnbm8gdXR4b3MhIScpO1xuICAgICAgcmV0dXJuIF87XG4gICAgfVxuXG4gICAgY29uc3QgZmVlID0gMjg0O1xuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gY3JlYXRlRGF0YVRyYW5zYWN0aW9uKFxuXHQgICAgXy5zZWxlY3RlZENoYW5uZWwsIFxuXHQgICAgcHJpdmF0ZUtleSwgXG5cdCAgICBsenMuY29tcHJlc3NUb1VURjE2KF8ubmV3TWVzc2FnZUlucHV0KSwgXG5cdCAgICBmZWUsIFxuICAgICAgICAgICAgdXR4b3MpO1xuXHQgICAgLypcbiAgICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBiY2guVHJhbnNhY3Rpb24oKVxuXHQgICAgICAgICAgICAgICAgICAgICAgIC5mcm9tKCBfLmRhdGEudXR4by5tYXAodSA9PiAoe3R4SWQ6IHUudHJhbnNhY3Rpb25faGFzaCwgb3V0cHV0SW5kZXg6IHUuaW5kZXgsIHNhdG9zaGlzOiB1LnZhbHVlLCBzY3JpcHQ6IF8uZGF0YS5hZGRyZXNzLnNjcmlwdF9oZXh9KSkpO1xuXG4gICAgaWYgKHJvb3RzWzBdICE9PSBwcml2YXRlS2V5LnRvQWRkcmVzcygpLnRvU3RyaW5nKCkpIHtcbiAgICAgIHRyYW5zYWN0aW9uLnRvKHJvb3RzWzBdLCBiY2guVHJhbnNhY3Rpb24uRFVTVF9BTU9VTlQpO1xuICAgICAgY29uc29sZS5sb2coJ2RpZmZlcmVudCBrZXknLCByb290c1swXSwgcHJpdmF0ZUtleS50b0FkZHJlc3MoKS50b1N0cmluZygpKTtcbiAgICB9XG5cbiAgICB0cmFuc2FjdGlvbi5jaGFuZ2UocHJpdmF0ZUtleS50b0FkZHJlc3MoKS50b1N0cmluZygpKVxuXHQgICAgICAgLmFkZERhdGEobHpzLmNvbXByZXNzVG9VVEYxNihfLm5ld01lc3NhZ2VJbnB1dCkpXG5cdCAgICAgICAuZmVlKGZlZSlcblx0ICAgICAgIC5zaWduKHByaXZhdGVLZXkpO1xuKi9cbiAgICBjb25zdCBzZXJpYWxpemVkID0gdHJhbnNhY3Rpb24uc2VyaWFsaXplKHtkaXNhYmxlRHVzdE91dHB1dHM6IHRydWV9KTtcblxuICAgIHNlbmRUcmFuc2FjdGlvbihzZXJpYWxpemVkKVxuXHQgIC50aGVuKCgpID0+IGdldEFkZHJlc3NEYXRhKGFkZHJlc3MpKVxuXHQgIC50aGVuKF8ubXV0YXRpb24oU0VUX0FERFJFU1NfREFUQSkpXG5cdCAgLnRoZW4oXy5tdXRhdGlvbihDTEVBUl9ORVdfTUVTU0FHRV9JTlBVVCkpXG5cdCAgLmNhdGNoKGVycm9yID0+IGNvbnNvbGUubG9nKCdicm9hZGNhc3QgZXJyb3InLCBlcnJvcikpO1xuXG4gICAgY29uc29sZS5sb2coJ3NlcmlhbGl6ZWQnLCBzZXJpYWxpemVkKTtcblxuICAgIHJldHVybiBfO1xuICB9LFxuXG4gIENSRUFURV9ORVdfQ0hBTk5FTDogKF8sIGRhdGEpID0+IHtcbiAgICBjb25zdCBuYW1lID0gcHJvbXB0KCdOZXcgY2hhbm5lbCBuYW1lJyk7XG5cbiAgICBpZiAobmFtZSAmJiBuYW1lICE9PSAnJykge1xuICAgICAgLy9jb25zdCBjaGFubmVsS2V5ID0gZ2V0QWRkcmVzc1dpdGhQcmVmaXgoJ3FxcScpO1xuICAgICAgY29uc3QgY2hhbm5lbEtleSA9IGNyZWF0ZUNoYW5uZWwoKTtcbiAgICAgIGNvbnN0IHV0eG9zID0gXy5hZGRyZXNzRGF0YVthZGRyZXNzLnRvU3RyaW5nKCldLnV0eG8ubWFwKHUgPT4gKHt0eElkOiB1LnRyYW5zYWN0aW9uX2hhc2gsIG91dHB1dEluZGV4OiB1LmluZGV4LCBzYXRvc2hpczogdS52YWx1ZSwgc2NyaXB0OiBfLmFkZHJlc3NEYXRhW2FkZHJlc3MudG9TdHJpbmcoKV0uYWRkcmVzcy5zY3JpcHRfaGV4fSkpO1xuXG4gICAgICBpZiAodXR4b3MubGVuZ3RoID09PSAwKSByZXR1cm4gbmV3IEVycm9yKCdub3QgZW5vdWdoIHV0eG9zICgwKScpO1xuICAgICAgXG4gICAgICBzZW5kVHJhbnNhY3Rpb24oY3JlYXRlRGF0YVRyYW5zYWN0aW9uKHJvb3RzWzBdLCBwcml2YXRlS2V5LCBsenMuY29tcHJlc3NUb1VURjE2KEpTT04uc3RyaW5naWZ5KFtjaGFubmVsS2V5LnRvQWRkcmVzcygpLnRvU3RyaW5nKCksIG5hbWVdKSksIDI4NSwgdXR4b3MpKVxuICAgICAgICAudGhlbihyZXN1bHQgPT4gcmVzdWx0Lmpzb24oKSlcbiAgICAgICAgLnRoZW4oanNvbiA9PiBjb25zb2xlLmxvZygnYnJvYWRjYXN0ZWQgY3JlYXRlJywgcmVzdWx0KSlcblx0LmNhdGNoKGVycm9yID0+IGNvbnNvbGUubG9nKCdicm9hZGNhc3QgY3JlYXRlIGVycm9yJywgZXJyb3IpKTtcbiAgICB9XG4gIH0sXG5cbiAgU0VUX0FERFJFU1NfREFUQTogKF8sIGFkZHJlc3MsIGRhdGEpID0+IHtcbiAgICBfLmFkZHJlc3NEYXRhW2FkZHJlc3NdID0gZGF0YTtcbiAgICByZXR1cm4gXztcbiAgfSxcblxuICBTRVRfVFJBTlNBQ1RJT05fREFUQTogKF8sIGNoYW5uZWwsIGRhdGEpID0+IHtcbiAgICBpZiAoZGF0YS5kYXRhKSB7XG4gICAgICBjb25zdCB0cmFuc2FjdGlvbnMgPSBkYXRhLmRhdGE7XG4gICAgIC8vIF8udHJhbnNhY3Rpb25zID0gXy50cmFuc2FjdGlvbnMuY29uY2F0KGRhdGEuZGF0YSk7XG5cbiAgICAgIGZvciAobGV0IGlkIGluIHRyYW5zYWN0aW9ucykge1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IHRyYW5zYWN0aW9uc1tpZF07XG4gICAgICAgIGZvciAobGV0IG91dHB1dCBvZiB0cmFuc2FjdGlvbi5vdXRwdXRzKSB7XG4gICAgICAgICAgLy9pZiAocm9vdHNbMF0udG9TdHJpbmcoKSA9PT0gYGJpdGNvaW5jYXNoOiR7b3V0cHV0LnJlY2lwaWVudH1gKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoXy5zZWxlY3RlZENoYW5uZWwudG9TdHJpbmcoKSA9PT0gYGJpdGNvaW5jYXNoOiR7b3V0cHV0LnJlY2lwaWVudH1gKSBjb250aW51ZTtcbi8qXG4gICAgICAgIGlmIChvdXRwdXQuc2NyaXB0X2hleC5pbmRleE9mKCc2YScpID09PSAwKSB7XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGx6cy5kZWNvbXByZXNzKG5ldyBCdWZmZXIob3V0cHV0LnNjcmlwdF9oZXguc3Vic3RyKDgpLCAnaGV4JykudG9TdHJpbmcoKSk7XG5cdCAgc3RvcmVUcmFuc2FjdGlvbk1lc3NhZ2UoaWQsIG1lc3NhZ2UpO1xuXHQgIF8ubWVzc2FnZXMudW5zaGlmdChtZXNzYWdlKTtcblx0fVxuKi9cblx0XG5cdCAgY29uc3Qgc2NyaXB0ID0gYmNoLlNjcmlwdC5mcm9tSGV4KG91dHB1dC5zY3JpcHRfaGV4KTtcblxuXHQgIGxldCBtZXNzYWdlO1xuICAgICAgICAgIGlmIChzY3JpcHQuaXNEYXRhT3V0KCkpIHtcblx0ICAgIGZvciAobGV0IGNodW5rIG9mIHNjcmlwdC5jaHVua3MpIHtcbiAgICAgICAgICAgICAgaWYgKGNodW5rLm9wY29kZW51bSA9PT0gMTA2KSBjb250aW51ZTtcblxuICAgICAgICAgICAgICBtZXNzYWdlID0gY2h1bmsuYnVmLnRvU3RyaW5nKCk7XG5cdCAgICB9XG4gICAgICAgICAgXG5cdCAgICBsZXQgZGVjb21wcmVzc2VkTWVzc2FnZSA9IGx6cy5kZWNvbXByZXNzRnJvbVVURjE2KG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShkZWNvbXByZXNzZWRNZXNzYWdlKTtcblx0ICAgICAgXy5jaGFubmVsc1tkYXRhWzBdXSA9IHtuYW1lOiBkYXRhWzFdLCBpZDogZGF0YVswXX07XG5cdCAgICAgIC8vXy5jaGFubmVscy5wdXNoKFtkYXRhWzBdLCBkYXRhWzFdXSk7XG5cdCAgICB9XG5cdCAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBfLm1lc3NhZ2VzW2NoYW5uZWxdLnB1c2goZGVjb21wcmVzc2VkTWVzc2FnZSk7XG5cdCAgICB9XG5cblx0ICAgIHN0b3JlVHJhbnNhY3Rpb25NZXNzYWdlKGlkLCBkZWNvbXByZXNzZWRNZXNzYWdlKTtcblx0ICB9XG5cdH0gICAvL2NvbnNvbGUubG9nKHNjcmlwdCwgc2NyaXB0LmlzRGF0YU91dCgpLCBvdXRwdXQsIHNjcmlwdC50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBmb3IgKGxldCB0eGlkIGluIGRhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBkID0gSlNPTi5wYXJzZShkYXRhW3R4aWRdKTtcbiAgICAgICAgICBfLmNoYW5uZWxzW2RbMF1dID0ge25hbWU6IGRbMV0sIGlkOiBkWzBdfTtcbiAgICAgICAgICAvL18uY2hhbm5lbHMucHVzaChbZFswXSwgZFsxXV0pO1xuXHR9XG5cdGNhdGNoIChlKSB7XG4gICAgICAgICAgXy5tZXNzYWdlc1tjaGFubmVsXS5wdXNoKGRhdGFbdHhpZF0pO1xuXHR9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF87XG4gIH0sXG5cbiAgU0VUX05FV19NRVNTQUdFX0lOUFVUOiAoXywgZXZlbnQpID0+IHtcbiAgICBfLm5ld01lc3NhZ2VJbnB1dCA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICBfLmNvbXByZXNzZWROZXdNZXNzYWdlSW5wdXQgPSBsenMuY29tcHJlc3MoXy5uZXdNZXNzYWdlSW5wdXQpO1xuXG4gICAgcmV0dXJuIF87XG4gIH0sXG5cbiAgQ0xFQVJfTkVXX01FU1NBR0VfSU5QVVQ6IChfKSA9PiB7XG4gICAgXy5uZXdNZXNzYWdlSW5wdXQgPSAnJztcbiAgICBfLmNvbXByZXNzZWROZXdNZXNzYWdlSW5wdXQgPSAnJztcblxuICAgIHJldHVybiBfO1xuICB9LFxuXG4gIENMSUNLRURfQ0hBTk5FTDogKF8sIGNoYW5uZWwpID0+IHtcbiAgICBfLnNlbGVjdGVkQ2hhbm5lbCA9IGNoYW5uZWw7XG4gICAgbG9hZENoYW5uZWxNZXNzYWdlcyhfKTtcbiAgICByZXR1cm4gXztcbiAgfSxcblxuICBFWFBPUlRfS0VZOiBfID0+IHtcbiAgICBwcm9tcHQoJ0NvcHkgY29tcHJlc3NlZCBrZXkhJywgbHpzLmNvbXByZXNzVG9VVEYxNihwcml2YXRlS2V5LnRvV0lGKCkpKTtcbiAgfSxcblxuICBJTVBPUlRfS0VZOiBfID0+IHtcbiAgICBjb25zdCBjV0lGID0gcHJvbXB0KCdFbnRlciBjb21wcmVzc2VkIGtleScpO1xuICAgIGNvbnN0IGtleSA9IG5ldyBiY2guUHJpdmF0ZUtleS5mcm9tV0lGKGx6cy5kZWNvbXByZXNzRnJvbVVURjE2KGNXSUYpKTtcblxuICAgIGlmIChsb2NhbFN0b3JhZ2UpIHtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdvbGRwcml2YXRla2V5JywgbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3ByaXZhdGVrZXknKSk7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncHJpdmF0ZWtleScsIGNXSUYpO1xuICAgIH1cblxuICAgIHByaXZhdGVLZXkgPSBrZXk7XG4gICAgYWRkcmVzcyA9IHByaXZhdGVLZXkudG9BZGRyZXNzKCk7XG4gIH1cbn07XG5cbmxldCBwcml2YXRlS2V5ID0gaW5pdCgpO1xubGV0IGFkZHJlc3MgPSBwcml2YXRlS2V5LnRvQWRkcmVzcygpO1xuXG5jb25zb2xlLmxvZyhhZGRyZXNzLnRvU3RyaW5nKCkpO1xuLy9jb25zb2xlLmxvZyhnZXRBZGRyZXNzV2l0aFByZWZpeCgncXFxJykudG9BZGRyZXNzKCkudG9TdHJpbmcoKSk7XG5cbmZ1bmN0aW9uIGdldEFkZHJlc3NXaXRoUHJlZml4IChwcmVmaXgpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gbmV3IGJjaC5Qcml2YXRlS2V5KCk7XG4gICAgY29uc3QgYWRkcmVzcyA9IHByaXZhdGVLZXkudG9BZGRyZXNzKCk7XG4gICAgY29uc3QgcyA9IGFkZHJlc3MudG9TdHJpbmcoKTtcblxuICAgIGlmIChzLmluZGV4T2YoYGJpdGNvaW5jYXNoOnEke3ByZWZpeH1gKSA9PT0gMCkgcmV0dXJuIHByaXZhdGVLZXk7XG4gIH1cbn1cblxuY29uc3QgQWRkcmVzc2VzID0gKHt9LCB7cHJpdmF0ZUtleSwgY2hhbm5lbHMsIGFkZHJlc3NEYXRhLCBkYXRhLCBtdXRhdGlvbn0pID0+IChcbiAgPGFkZHJlc3Nlcz5cbiAgICA8ZGl2Pntwcml2YXRlS2V5LnRvQWRkcmVzcygpLnRvU3RyaW5nKCl9PC9kaXY+XG4gICAgPGRpdj57YWRkcmVzc0RhdGFbcHJpdmF0ZUtleS50b0FkZHJlc3MoKS50b1N0cmluZygpXSAhPT0gdW5kZWZpbmVkID8gKGFkZHJlc3NEYXRhW3ByaXZhdGVLZXkudG9BZGRyZXNzKCkudG9TdHJpbmcoKV0uYWRkcmVzcy5iYWxhbmNlID09PSAwID8gJ1NlbmQgQml0Y29pbiBDYXNoIHRvIGFib3ZlIGFkZHJlc3MnIDogYWRkcmVzc0RhdGFbcHJpdmF0ZUtleS50b0FkZHJlc3MoKS50b1N0cmluZygpXS5hZGRyZXNzLmJhbGFuY2UpIDogJ3dhaXRpbmcgZm9yIGJhbGFuY2UnfTwvZGl2PlxuICAgIDxidXR0b24gb25DbGljaz17bXV0YXRpb24oRVhQT1JUX0tFWSl9PkV4cG9ydCBLZXk8L2J1dHRvbj5cbiAgICA8YnV0dG9uIG9uQ2xpY2s9e211dGF0aW9uKElNUE9SVF9LRVkpfT5JbXBvcnQgS2V5PC9idXR0b24+XG4gICAgeyFjaGFubmVscyA/IHVuZGVmaW5lZCA6IE9iamVjdC5rZXlzKGNoYW5uZWxzKS5tYXAoY2hhbm5lbCA9PiA8Q2hhbm5lbCBjaGFubmVsPXtjaGFubmVsc1tjaGFubmVsXX0gLz4pfVxuICAgIDxidXR0b24gb25DbGljaz17bXV0YXRpb24oQ1JFQVRFX05FV19DSEFOTkVMKX0+Q3JlYXRlIE5ldyBDaGFubmVsPC9idXR0b24+XG4gIDwvYWRkcmVzc2VzPlxuKTtcblxuY29uc3QgVHJhbnNhY3Rpb24gPSAoe3RyYW5zYWN0aW9ufSwge30pID0+IChcbiAgPHRyYW5zYWN0aW9uPlxuICAgIHt0cmFuc2FjdGlvbi5vdXRwdXRzLm1hcChvdXRwdXQgPT4gYGJpdGNvaW5jYXNoOiR7b3V0cHV0LnJlY2lwaWVudH1gID09PSBwcml2YXRlS2V5LnRvQWRkcmVzcygpLnRvU3RyaW5nKCkgPyB1bmRlZmluZWQgOiA8ZGl2PntvdXRwdXQucmVjaXBpZW50fXtsenMuZGVjb21wcmVzcyhvdXRwdXQucmVjaXBpZW50KX08L2Rpdj4pfVxuICA8L3RyYW5zYWN0aW9uPlxuKTtcblxuY29uc3QgTWVzc2FnZSA9ICh7bWVzc2FnZX0pID0+IChcbiAgPG1lc3NhZ2U+e21lc3NhZ2V9PC9tZXNzYWdlPlxuKTtcblxuY29uc3QgQ2hhbm5lbCA9ICh7Y2hhbm5lbH0sIHttdXRhdGlvbn0pID0+IChcbiAgPGNoYW5uZWwgdGl0bGU9e2NoYW5uZWwuaWR9IG9uQ2xpY2s9e211dGF0aW9uKENMSUNLRURfQ0hBTk5FTCwgY2hhbm5lbC5pZCl9PntjaGFubmVsLm5hbWV9PC9jaGFubmVsPlxuKTtcblxuY29uc3QgVmlld2VyID0gKHtjaGFubmVsfSwge2NoYW5uZWxCYWxhbmNlLCBjb21wcmVzc2VkTmV3TWVzc2FnZUlucHV0LCBuZXdNZXNzYWdlSW5wdXQsIG1lc3NhZ2VzLCB0cmFuc2FjdGlvbnMsIGNoYW5uZWxzLCBhZGRyZXNzRGF0YSwgbXV0YXRpb259KSA9PiAoXG4gIDx2aWV3ZXI+XG4gICAgPGNoYW5uZWwtaWQ+Q2hhbm5lbCBBZGRyZXNzOiB7Y2hhbm5lbH08L2NoYW5uZWwtaWQ+XG4gICAgPGNoYW5uZWwtYmFsYW5jZT5DaGFubmVsIEJhbGFuY2U6IHthZGRyZXNzRGF0YVtjaGFubmVsXSA/IGFkZHJlc3NEYXRhW2NoYW5uZWxdLmFkZHJlc3MuYmFsYW5jZSA6ICd3YWl0aW5nIGZvciBiYWxhbmNlJ308L2NoYW5uZWwtYmFsYW5jZT5cbiAgICA8bWVzc2FnZXM+eyFtZXNzYWdlcyA/IHVuZGVmaW5lZCA6IG1lc3NhZ2VzW2NoYW5uZWxdLm1hcChtZXNzYWdlID0+IDxNZXNzYWdlIG1lc3NhZ2U9e21lc3NhZ2V9IC8+KX08L21lc3NhZ2VzPlxuICAgIDx0ZXh0YXJlYSB2YWx1ZT17bmV3TWVzc2FnZUlucHV0fSBvbklucHV0PXttdXRhdGlvbihTRVRfTkVXX01FU1NBR0VfSU5QVVQpfT48L3RleHRhcmVhPlxuICAgIDxidXR0b24gb25DbGljaz17bXV0YXRpb24oU0VORF9UUkFOU0FDVElPTil9PlNlbmQ8L2J1dHRvbj5cbiAgICA8ZGl2Pntjb21wcmVzc2VkTmV3TWVzc2FnZUlucHV0fTwvZGl2PlxuICAgIDxkaXY+e2NvbXByZXNzZWROZXdNZXNzYWdlSW5wdXQgPyBuZXcgQmxvYihbY29tcHJlc3NlZE5ld01lc3NhZ2VJbnB1dF0pLnNpemUgOiAnMCd9IC8gMjQwPC9kaXY+XG4gIDwvdmlld2VyPlxuKTtcblxuY29uc3QgU2lkZUJ5U2lkZSA9ICh7c2VsZWN0ZWRDaGFubmVsfSkgPT4gKFxuICA8c2lkZS1ieS1zaWRlPlxuICAgIDxBZGRyZXNzZXMgLz5cbiAgICA8Vmlld2VyIGNoYW5uZWw9e3NlbGVjdGVkQ2hhbm5lbH0gLz5cbiAgPC9zaWRlLWJ5LXNpZGU+XG4pO1xuXG5jb25zdCBJTklUX0dVSSA9ICh7fSwge2luaXRlZCwgc2VsZWN0ZWRDaGFubmVsLCBtdXRhdGlvbn0pID0+IGluaXRlZCA/IDxHVUkgc2VsZWN0ZWRDaGFubmVsPXtzZWxlY3RlZENoYW5uZWx9IC8+IDogbXV0YXRpb24oSU5JVCkobXV0YXRpb24pO1xuXG5jb25zdCBHVUkgPSAoe3NlbGVjdGVkQ2hhbm5lbH0pID0+IChcbiAgPFNpZGVCeVNpZGUgc2VsZWN0ZWRDaGFubmVsPXtzZWxlY3RlZENoYW5uZWx9Lz5cbik7XG5cbnJlbmRlcihcbiAgSU5JVF9HVUksIHtcbiAgICBzZWxlY3RlZENoYW5uZWw6IHJvb3RzWzBdLFxuICAgIHByaXZhdGVLZXkgXG4gIH0sIGRvY3VtZW50LmJvZHlcbik7XG4iXX0=
