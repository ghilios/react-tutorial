import App from './app';
import React from 'react';
import ReactDOM from 'react-dom';

main();

function main() {
    const app = document.createElement('div');

    document.body.appendChild(app);

    ReactDOM.render(<App />, app);
}