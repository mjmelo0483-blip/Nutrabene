const QRCode = require('qrcode');

QRCode.toFile('public/assets/qrcode_cadastro.png', 'https://nutrabene.vercel.app/#register', {
    width: 400,
    margin: 2,
    color: {
        dark: '#2c3e2c',
        light: '#ffffff'
    }
}, (err) => {
    if (err) console.error(err);
    else console.log('QR Code gerado com sucesso em public/assets/qrcode_cadastro.png');
});
