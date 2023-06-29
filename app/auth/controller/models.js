// by Logan <https://github.com/loganworld>
// at 19/08/2022

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const linkSchema = new Schema({
    type: {
        type: String,
    },
    href: {
        type: String,
    },
});
// Create Schema
const UserBasicSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
    },
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    password: {
        type: String,
    },
    address: {
        type: String,
    },
    description: {
        type: String,
    },
    image: {
        type: String,
    },
    coverImage: {
        type: String,
    },
    links: [linkSchema],
    merit: {
        type: Number,
    },
    followers: [{ type: String }],
    referralCode: { type: String },
    referrer: {type: String},
    referrallers:  [{ type: String }],
    referralReward: {type: Number}
});

// const UserSchema = new Schema();
// UserSchema.add(UserBasicSchema);

module.exports = Users = mongoose.model("users", UserBasicSchema);
