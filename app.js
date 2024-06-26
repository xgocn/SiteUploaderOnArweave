let gateway='arweave.net';
const arweave = Arweave.init({
    host: gateway, // 主机名
    port: 443, // 端口
    protocol: 'https' // 协议
});

let manifest = {
    manifest: 'arweave/paths',
    version: '0.1.0',
    paths: {},
    index: {}
};

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
        

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    } else {
        console.error('File input element not found.');
    }
    
        // 检查文件输入并更新按钮状态的函数
    function updateButtonState() {
        if (fileInput.files.length > 0) {
            uploadButton.disabled = false; // 有文件被选中，启用按钮
            uploadButton.addEventListener('click', uploadFilesAndGenerateManifest);
        } else {
            uploadButton.disabled = true;  // 没有文件被选中，禁用按钮
        }
    }
    
    // 添加事件监听器来响应文件选择的变化
    fileInput.addEventListener('change', updateButtonState);
    connectArConnect();

});


function handleFileSelect() {
    const input = document.getElementById('fileInput');
    const fileListContainer = document.getElementById('fileList');
    fileListContainer.innerHTML = '<h2>Files List:</h2>'; // 初始化文件列表标题
    const filesArray = Array.from(input.files);
    let isFirstHtmlFile = true;

    // 定义函数去除顶级目录
    const trimTopDirectory = (path) => {
        const pathParts = path.split('/');
        pathParts.shift(); // 移除第一个元素，即顶级目录
        return pathParts.join('/'); // 重新连接剩余部分
    };

    filesArray.forEach(file => {
        let filePath = file.webkitRelativePath || file.name; // 使用相对路径或文件名
        filePath = trimTopDirectory(filePath); // 调整路径以移除顶级目录

        if (filePath.endsWith('.html')) {
            const radioHtml = `<input type="radio" name="indexPage" value="${filePath}" ${isFirstHtmlFile ? 'checked' : ''}> Set as index`;
            fileListContainer.innerHTML += `<li>${filePath} ${radioHtml}</li>`;
            if (isFirstHtmlFile) {
                manifest.index = { path: filePath };
                isFirstHtmlFile = false;
            }
        } else {
            fileListContainer.innerHTML += `<li>${filePath}</li>`;
        }
    });

    console.log(manifest.index);

    // 事件委托监听器设置在文件列表容器上
    fileListContainer.addEventListener('change', function(event) {
        if (event.target.name === 'indexPage' && event.target.type === 'radio') {
            manifest.index = { path: event.target.value }; // 更新首页设置
            console.log('Index page:', manifest.index);
        }
    });
}



async function uploadFilesAndGenerateManifest() {
    const files = document.getElementById('fileInput').files;
    let paths = {};

    // 遍历所有选中的文件，上传并获取 ID
    for (let file of files) {
        const data = await file.arrayBuffer();
        let transaction = await arweave.createTransaction({ data });
        transaction.addTag('Content-Type', file.type);

        // 假设已经连接到 ArConnect
        await arweave.transactions.sign(transaction);
        let response = await arweave.transactions.post(transaction);

        // 存储每个文件的交易 ID
        const filePath = file.name; // 使用文件名而不是路径
        paths[filePath] = { id: transaction.id };
        //paths[file.webkitRelativePath] = { id: transaction.id };
    }


    // 生成 manifest 数据
    manifest.paths = paths;
    //manifest.index = { path: 'index.html' }; // 设定首页
    // 创建 manifest 交易
    const manifestData = JSON.stringify(manifest);
    let manifestTransaction = await arweave.createTransaction({ data: manifestData });
    manifestTransaction.addTag('Content-Type', 'application/x.arweave-manifest+json');
    await arweave.transactions.sign(manifestTransaction);
    await arweave.transactions.post(manifestTransaction);

    // 显示 manifest 和通知用户
    document.getElementById('manifestData').innerHTML = `<h2>Manifest:</h2><pre>${JSON.stringify(manifest, null, 2)}</pre>`;
    alert('Your site is live with Manifest ID: ' + manifestTransaction.id);
    siteurl.innerHTML = '<h2>siteurl:</h2>'; // 初始化文件列表标题
    siteurl.innerHTML += `<a href="https://${gateway+'/'+manifestTransaction.id}" target="_blank">https://${gateway+'/'+manifestTransaction.id}</a>`;
}

async function connectArConnect() {
    try {
        // 检查 ArConnect 是否已安装
        if (!window.arweaveWallet) {
            alert('Please install ArConnect.');
            return;
        }
        
        // 请求连接到用户的 ArConnect 钱包
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'DISPATCH']);

        // 获取钱包地址
        const address = await window.arweaveWallet.getActiveAddress();
        console.log('Connected to ArConnect, wallet address:', address);
    } catch (error) {
        console.error('Error connecting to ArConnect:', error);
        alert('Error connecting to ArConnect. Check console for more details.');
    }
}
