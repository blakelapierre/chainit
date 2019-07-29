import { h, render } from 'preact-cycle';
import bch from 'bitcore-lib-cash';

const privateKey = new bch.PrivateKey();
const address = privateKey.toAddress();

console.log(address.toString());
console.log(getAddressWithPrefix('').toAddress().toString());

function getAddressWithPrefix (prefix) {
  while (true) {
    const privateKey = new bch.PrivateKey();
    const address = privateKey.toAddress();
    const s = address.toString();

    if (s.indexOf(`bitcoincash:q${prefix}`) === 0) return privateKey;
  }
}

const Addresses = () => (
  <addresses>

  </addresses>
);

const Viewer = () => (
  <viewer>

  </viewer>
);

const SideBySide = () => (
  <side-by-side>
    <Addresses />
    <Viewer />
  </side-by-side>
);

render(
  SideBySide, {
    
  }, document.body
);
