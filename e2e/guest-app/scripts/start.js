const { exec } = require('child_process');
const os = require('os');

const runCommand = () => {
  const platform = os.platform();
  const port = process.env.PORT || '3002';

  let command;

  if (platform === 'win32') {
    command = `set PORT=${port} && react-scripts start`;
  } else {
    command = `PORT=${port} react-scripts start`;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
};

runCommand();
