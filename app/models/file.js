const mongoose = require('mongoose')
mongoose.Promise = require('q').Promise;
const Schema = mongoose.Schema;

const FileSchema = new Schema({
    filename: String,
    ipfshash: String,
    filesize: Number,
    owner: {type: Schema.Types.ObjectId, ref: 'User'},
    hasAccess: [{type: Schema.Types.ObjectId, ref: 'User'}],
    createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model("File", FileSchema);