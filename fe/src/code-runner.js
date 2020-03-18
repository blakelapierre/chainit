import { h, render } from 'preact-cycle';
import { Component } from 'preact';

// class CodeRunner extends Component {
//   componentDidMount() {
//     this.iframe = document.createElement('iframe');
//     this.iframe.src = 'about:blank';
//     console.dir(this);
//     this.base.appendChild(this.iframe);
//   }

//   render() {
//     return (
//       <code-runner>
//         code runner
//       </code-runner>
//     );
//   }
// }

// class CodeRunner extends Component {
//   componentDidMount() {
    
//   }

//   render() {
//     return (
//       <code-runner>
//         <code-text>{code}</code-text>
//         <button onClick={mutation(RUN_CODE)} />
//       </code-runner>
//     );
//   }
// }

const { RUN_CODE } = {
  RUN_CODE (_, code, event) {
    const passcode = 'make random?';
    const response = prompt(`This code may have access to your private keys and anything else currently on this page. Are you sure you want to run it? If so, please type ${passcode}`);
    
    if (response === passcode) {
      const s = document.createElement('script');
      s.src = 'data:text/javascript,' + encodeURIComponent(code);
      event.target.parentElement.appendChild(s);
    }
  }
}

const CodeRunner = ({code}, {mutation}) => (
  <code-runner>
    <code-text>{code}</code-text>
    <button onClick={mutation(RUN_CODE, code)}>Run Code</button>
  </code-runner>
);

export { CodeRunner };