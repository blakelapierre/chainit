!function o(s,c,i){function u(t,e){if(!c[t]){if(!s[t]){var n="function"==typeof require&&require;if(!e&&n)return n(t,!0);if(l)return l(t,!0);var r=new Error("Cannot find module '"+t+"'");throw r.code="MODULE_NOT_FOUND",r}var a=c[t]={exports:{}};s[t][0].call(a.exports,function(e){return u(s[t][1][e]||e)},a,a.exports,o,s,c,i)}return c[t].exports}for(var l="function"==typeof require&&require,e=0;e<i.length;e++)u(i[e]);return u}({1:[function(e,t,n){"use strict";var i=e("preact-cycle"),k=r(e("bitcore-lib-cash")),F=r(e("lz-string"));function r(e){return e&&e.__esModule?e:{default:e}}function s(e){if(null==e)throw new TypeError("Cannot destructure undefined")}var o=["bitcoincash:qqqqe3jhn7wu6t6nj5gq5z0y3pgsycd8h5jng9r3e7"];function a(e){return fetch("https://api.blockchair.com/bitcoin-cash/dashboards/address/"+e.toString()).then(function(e){return e.json()}).then(function(e){return e.data[Object.keys(e.data)[0]]}).catch(function(e){return console.log(e)})}function c(e,t){var n=e.reduce(function(e,t){var n=function(e){if(localStorage)return F.default.decompressFromUTF16(localStorage.getItem("T-"+e))}(t);return n?e.found[t]=n:e.remaining.push(t),e},{found:{},remaining:[]}),r=n.found,a=n.remaining;t(new Promise(function(e){return e(r)}));for(var o=0;o<a.length;o+=10)t(u(a.slice(o,Math.min(a.length,o+10))))}function u(t){return fetch("https://api.blockchair.com/bitcoin-cash/dashboards/transactions/"+t.join(",")).then(function(e){return e.json()}).catch(function(e){return console.log("txids",t,e)})}function l(t){return function(e){return fetch("https://rest.bitcoin.com/v2/rawtransactions/sendRawTransaction/"+e)}(t).then(function(e){return e.ok?e:d(t)}).then(function(e){return e.json()}).then(function(e){return console.log("broadcaster",e)}).catch(function(e){return d(t)})}function d(e){var t=new FormData;return t.append("data",e),fetch("https://api.blockchair.com/bitcoin-cash/push/transaction",{method:"POST",body:t})}function f(e,t,n,r,a){var o=new k.default.Transaction,s=t.toAddress().toString();return o.from(a),e!==s&&o.to(e,k.default.Transaction.DUST_AMOUNT),o.addData(n).change(s).fee(r).sign(t),o}function h(e){var t=e.mutation,n=e.selectedChannel;e.messages={},e.messages[n]=e.messages[n]||[],a(n).then(t(I,n)).then(function(){c(e.addressData[n].transactions,function(e){e.then(t(w,n))})})}function g(e,t){return e.inited=!0,e.mutation=t,e.messages={},e.channels={},e.channels[o[0]]={name:"root",id:o[0]},e.addressData={},e.refreshInterval=3e4,e.refreshTimerId=function(e,t){return e(),setInterval(e,t)}(function(){a(C.toString()).then(t(I,C.toString())),h(e)},e.refreshInterval),e}function p(t){if(""!==t.newMessageInput&&void 0!==t.newMessageInput&&!(240<t.compressedNewMessageInput.length)){var e=t.addressData[C.toString()].utxo.map(function(e){return{txId:e.transaction_hash,outputIndex:e.index,satoshis:e.value,script:t.addressData[C.toString()].address.script_hex}}),n=f(t.selectedChannel,x,F.default.compressToUTF16(t.newMessageInput),284,e).serialize({disableDustOutputs:!0});return l(n).then(function(){return a(C)}).then(t.mutation(I)).then(t.mutation(T)).catch(function(e){return console.log("broadcast error",e)}),console.log("serialized",n),t}}function m(t,e){var n=prompt("New channel name");if(n&&""!==n){var r=function(){if(!localStorage)return alert("No localStorage!!! new key will not be saved!");var e=D("qqq"),t=parseInt(localStorage.getItem("channelKeyCount")||"0")+1;return localStorage.setItem("channelKeyCount",t),localStorage.setItem("channelKey-"+t,F.default.compressToUTF16(e.toWIF())),e}(),a=t.addressData[C.toString()].utxo.map(function(e){return{txId:e.transaction_hash,outputIndex:e.index,satoshis:e.value,script:t.addressData[C.toString()].address.script_hex}});l(f(o[0],x,F.default.compressToUTF16(JSON.stringify([r.toAddress().toString(),n])),285,a)).then(function(e){return e.json()}).then(function(e){return console.log("broadcasted create",result)}).catch(function(e){return console.log("broadcast create error",e)})}}function v(e,t){return e.newMessageInput=t.target.value,e.compressedNewMessageInput=F.default.compress(e.newMessageInput),e}function y(e,t){return e.selectedChannel=t,h(e),e}function b(e){var t=prompt("Enter compressed key"),n=new k.default.PrivateKey.fromWIF(F.default.decompressFromUTF16(t));localStorage&&(localStorage.setItem("oldprivatekey",localStorage.getItem("privatekey")),localStorage.setItem("privatekey",t)),C=(x=n).toAddress()}function S(e){prompt("Copy compressed key!",F.default.compressToUTF16(x.toWIF()))}var I=function(e,t,n){return e.addressData[t]=n,e},w=function(t,n,r){if(r.data){var e=r.data;for(var a in e){var o=e[a],s=!0,c=!1,i=void 0;try{for(var u,l=o.outputs[Symbol.iterator]();!(s=(u=l.next()).done);s=!0){var d=u.value;if(t.selectedChannel.toString()!=="bitcoincash:"+d.recipient){var f=k.default.Script.fromHex(d.script_hex),h=void 0;if(f.isDataOut()){var g=!0,p=!1,m=void 0;try{for(var v,y=f.chunks[Symbol.iterator]();!(g=(v=y.next()).done);g=!0){var b=v.value;106!==b.opcodenum&&(h=b.buf.toString())}}catch(e){p=!0,m=e}finally{try{!g&&y.return&&y.return()}finally{if(p)throw m}}console.log({message:h});var S=F.default.decompressFromUTF16(h);try{var I=JSON.parse(S);t.channels[I[0]]={name:I[1],id:I[0]}}catch(e){t.messages[n].push(S)}x=a,C=S,localStorage&&localStorage.setItem("T-"+x,F.default.compressToUTF16(C)),console.log(d.script_hex,f.getData().toString(),S,f)}}}}catch(e){c=!0,i=e}finally{try{!s&&l.return&&l.return()}finally{if(c)throw i}}}}else for(var w in r){console.log("txid",w,r);try{var T=JSON.parse(r[w]);t.channels[T[0]]={name:T[1],id:T[0]}}catch(e){console.log(r[w],e),t.messages[n].push(r[w])}}var x,C;return t},T=function(e){return e.newMessageInput="",e.compressedNewMessageInput="",e},x=function(){if(localStorage){var e=localStorage.getItem("privatekey");if(e)return new k.default.PrivateKey.fromWIF(F.default.decompressFromUTF16(e));var t=D("qqq");return localStorage.setItem("privatekey",F.default.compressToUTF16(t.toWIF())),t}alert("No localStorage!!!! new key will not be saved!")}(),C=x.toAddress();function D(e){for(;;){var t=new k.default.PrivateKey;if(0===t.toAddress().toString().indexOf("bitcoincash:q"+e))return t}}console.log(C.toString());function q(e,t){var n=t.privateKey,r=t.channels,a=t.addressData,o=(t.data,t.mutation);return s(e),(0,i.h)("addresses",null,(0,i.h)("div",null,n.toAddress().toString()),(0,i.h)("div",null,void 0!==a[n.toAddress().toString()]?0===a[n.toAddress().toString()].address.balance?"Send Bitcoin Cash to above address":a[n.toAddress().toString()].address.balance:"waiting for balance"),(0,i.h)("button",{onClick:o(S)},"Export Key"),(0,i.h)("button",{onClick:o(b)},"Import Key"),r?Object.keys(r).map(function(e){return(0,i.h)(O,{channel:r[e]})}):void 0,(0,i.h)("button",{onClick:o(m)},"Create New Channel"))}function M(e){var t=e.message;return(0,i.h)("message",null,t)}function N(e,t){var n=e.channel,r=(t.channelBalance,t.compressedNewMessageInput),a=t.newMessageInput,o=t.messages,s=(t.transactions,t.channels,t.addressData),c=t.mutation;return(0,i.h)("viewer",null,(0,i.h)("channel-id",null,n),(0,i.h)("channel-balance",null,s[n]?s[n].address.balance:"waiting for balance"),o?o[n].map(function(e){return(0,i.h)(M,{message:e})}):void 0,(0,i.h)("textarea",{value:a,onInput:c(v)}),(0,i.h)("button",{onClick:c(p)},"Send"),(0,i.h)("div",null,r),(0,i.h)("div",null,r?new Blob([r]).size:"0"," / 240"))}function U(e){var t=e.selectedChannel;return(0,i.h)("side-by-side",null,(0,i.h)(q,null),console.log(t),(0,i.h)(N,{channel:t}))}var O=function(e,t){var n=e.channel,r=t.mutation;return(0,i.h)("channel",{title:n.id,onClick:r(y,n.id)},n.name)},_=function(e){var t=e.selectedChannel;return(0,i.h)(U,{selectedChannel:t})};(0,i.render)(function(e,t){var n=t.inited,r=t.selectedChannel,a=t.mutation;return s(e),n?(0,i.h)(_,{selectedChannel:r}):a(g)(a)},{selectedChannel:o[0],privateKey:x},document.body)},{"bitcore-lib-cash":"bitcore-lib-cash","lz-string":"lz-string","preact-cycle":"preact-cycle"}]},{},[1]);