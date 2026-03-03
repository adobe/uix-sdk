/* eslint-disable no-undef, @typescript-eslint/no-require-imports */
const { MessageChannel, MessagePort } = require("node:worker_threads");
window.MessageChannel = MessageChannel;
window.MessagePort = MessagePort;
