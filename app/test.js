const openpgp = require('openpgp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const detectCharacterEncoding = require('detect-character-encoding');
const iconv = require('iconv-lite');

openpgp.config.aead_protect = true;
const user = {
    name: "test",
    email: "test@gmail.com"
};

const encryptedFolder = path.join(__dirname, "/../test/encrypted/");
const decryptedFolder = path.join(__dirname, "/../test/decrypted/");

const image = path.join(__dirname, "/../test/file.jpg");
const txt = path.join(__dirname, "/../test/file.txt");
const doc = path.join(__dirname, "/../test/biography_rus.doc");

function CryptoService(user) {
    if (!user) {
        throw new Error();
    }
    if (!user.passphrase) {
        user.passphrase = crypto.randomBytes(32).toString('hex');
    }
    this.user = user;
}

CryptoService.prototype.generateKeys = function () {
    const options = {
        userIds: [{name: this.user.name, email: this.user.email}],
        numBits: 1024,
        passphrase: this.user.passphrase
    };
    return openpgp.generateKey(options);
};

CryptoService.prototype.encrypt = function (data) {
    const options = {
        publicKeys: openpgp.key.readArmored(this.user.publicKey).keys,
        data: data
    };
    return openpgp.encrypt(options);
};

CryptoService.prototype.decrypt = function (data) {
    let privKeyObj = openpgp.key.readArmored(this.user.privateKey).keys[0];
    privKeyObj.decrypt(this.user.passphrase);
    const options = {
        message: openpgp.message.readArmored(data),
        privateKey: privKeyObj
    };
    return openpgp.decrypt(options);
};

console.time('test');
const service = new CryptoService(user);
// service.generateKeys().then(function (key) {
//     user.privateKey = key.privateKeyArmored;
//     user.publicKey = key.publicKeyArmored;
//     const readFileEnc = fs.readFileSync(doc);
//     const enc = detectCharacterEncoding(readFileEnc);
//     const encoding = enc.encoding || 'utf-8';
//     const readFile = readFileSync_encoding(doc, encoding);
//     service.encrypt(readFile).then(function (cipherText) {
//         // fs.writeFileSync(encryptedFolder + "1.doc", cipherText.data);
//         // const encryptedFile = fs.readFileSync(encryptedFolder + "1.doc");
//         service.decrypt(cipherText.data).then(function (binary) {
//             fs.writeFileSync(decryptedFolder + "1.doc", binary.data);
//             console.timeEnd("test")
//         });
//     })
//         .catch(function (err) {
//             console.log(err);
//         })
// }).catch(function (err) {
//     console.log(err);
// });

service.generateKeys().then(function (key) {
    fs.writeFileSync('key.gpg.prv', key.privateKeyArmored);
    fs.writeFileSync('key.gpg.pub', key.publicKeyArmored);
})

function readFileSync_encoding(filename, encoding) {
    let content = fs.readFileSync(filename);
    return iconv.decode(content, encoding);
}
//
// function writeFileSycn_enc(dest, data, enc) {
//     fs.writeFileSync(dest, iconv.decode())
// }