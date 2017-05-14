const mongoose = require('mongoose')
mongoose.Promise = require('q').Promise;
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');

const UserSchema = new Schema({
    username: String,
    password: String,
    passphrase: String,
    publicKey: String,
    secretKey: String,
    files: [{type: Schema.Types.ObjectId, ref: 'File' }],
    createdAt: {type: Date, default: Date.now}
});

UserSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);