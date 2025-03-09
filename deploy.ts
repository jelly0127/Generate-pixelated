const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const SERVER = 'root@47.239.208.144';
const REMOTE_DIR = '/root/z-block/zero-block';
const LOCAL_DIR = path.join(__dirname, '.next');
const LOCAL_PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_FILE = path.join(__dirname, '.env');

// Create password prompt function
function promptPassword(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter your SSH password: ', (password) => {
      rl.close();
      resolve(password);
    });
  });
}

// 检查必要文件和目录是否存在
function checkRequiredFiles(): void {
  if (!fs.existsSync(LOCAL_DIR)) {
    throw new Error('.next 目录不存在，请先运行 npm run build');
  }
  if (!fs.existsSync(LOCAL_PUBLIC_DIR)) {
    throw new Error('public 目录不存在');
  }
}

// 执行单个命令并返回 Promise
function executeCommand(command: string, password?: string): Promise<string> {
  // If password is provided and the command is SSH/SCP, use sshpass
  const cmdWithPassword =
    password && (command.startsWith('ssh') || command.startsWith('scp'))
      ? command.replace(/^(ssh|scp)/, `sshpass -p "${password}" $1 -o StrictHostKeyChecking=no`)
      : command;

  return new Promise((resolve, reject) => {
    exec(cmdWithPassword, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Warning: ${stderr}`);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}

async function deploy(): Promise<void> {
  try {
    console.log('开始部署流程...');
    const startTime = Date.now();

    // 检查必要文件
    checkRequiredFiles();

    // 不再需要提前获取密码
    // const password = await promptPassword();

    const commands = [
      // 确保远程目录存在 (将提示输入密码)
      `ssh ${SERVER} "mkdir -p ${REMOTE_DIR}/.next ${REMOTE_DIR}/public"`,

      // 复制环境变量文件（如果存在）
      ...(fs.existsSync(ENV_FILE) ? [`scp ${ENV_FILE} ${SERVER}:${REMOTE_DIR}/.env`] : []),

      // 复制构建文件到服务器
      `scp -r ${LOCAL_DIR}/* ${SERVER}:${REMOTE_DIR}/.next/`,

      // 复制 public 目录到服务器
      `scp -r ${LOCAL_PUBLIC_DIR}/* ${SERVER}:${REMOTE_DIR}/public/`,

      // 使用yarn安装依赖
      `ssh ${SERVER} "cd ${REMOTE_DIR} && yarn install"`,

      // 使用 pm2 reload 实现零停机重启
      `ssh ${SERVER} "cd ${REMOTE_DIR} && pm2 reload zero-block || pm2 start npm --name 'zero-block' -- start"`,

      // 检查部署后的服务状态
      `ssh ${SERVER} "pm2 show zero-block"`,
    ];

    // 逐个执行命令（每个命令都会提示输入密码）
    for (const command of commands) {
      console.log(`执行: ${command}`);
      await execCommand(command);
    }

    const deployTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`部署完成！耗时: ${deployTime}秒`);
  } catch (error) {
    console.error('部署过程中发生错误:', error);
    process.exit(1);
  }
}

// 修改execCommand函数，不再使用sshpass
async function execCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 直接执行命令，会在需要时提示输入密码
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行错误: ${error}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`警告: ${stderr}`);
      }
      if (stdout) {
        console.log(stdout);
      }
      resolve();
    });
  });
}

// 开始部署
console.log('正在检查环境...');
deploy().catch((error) => {
  console.error('部署过程中发生错误:', error);
  process.exit(1);
});
