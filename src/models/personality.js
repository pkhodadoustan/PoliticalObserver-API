const mongoose = require('mongoose');

const Schema = mongoose.Schema;

var personalitySchema = new Schema({
    personalityType: String,
    name: String,
    stats: String,
    description: String,
    strengths: String,
    weaknesses: String,
},{
    toJSON: {
        getters: true,
    },
});

personalitySchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('personality', personalitySchema);
