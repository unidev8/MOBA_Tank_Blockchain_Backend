// by Logan <https://github.com/loganworld>
// at 19/08/2022

const jwt = require("jsonwebtoken");
const ethers = require("ethers");
const UserController = require("../controller");
const { ReferralController, NotificationController } = require("../../blockchain/controllers");
const { getHash } = require("../utils");
const ipfsAPI = require("ipfs-api");
const ipfs = ipfsAPI(process.env.IPFS_HOST, process.env.IPFS_PORT, {
    protocol: process.env.IPFS_OPT,
});

const randomReferralString = (length = 32) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    let str = ""
    for (var i = 0; i < length - 1; i++) {
        str += characters.charAt(Math.floor(Math.random() * length));
    }
    return ethers.utils.formatBytes32String(str);
}

const AuthApi = {
    signUp: async (req, res) => {
        try {
            const { name, email, password, signature } = req.body;
            var address = "";
            try {
                address = await ethers.utils.verifyMessage(
                    "welcome " + name,
                    signature
                );
            } catch (err) {
                throw new Error("Invalid signature");
            }
            const hashedPassword = getHash(name, password);
            const tmpRef = "dfsd";
            // create user data
            var userData = await UserController.create({
                name,
                email,
                hashedPassword,
                address
            });

            // return jwt token for auth
            const token = jwt.sign(
                {
                    name: userData.name,
                    address: userData.address,
                    email: userData.email,
                },
                process.env.TOKEN_SECRET,
                {
                    expiresIn: "144h",
                }
            );
            res.status(200).json({ status: true, token: token });
        } catch (err) {
            console.error("Auth/signUp : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    logIn: async (req, res) => {
        try {
            const { name, password } = req.body;
            var userData;
            try {
                if (!name) throw new Error("invalid username");
                userData = await UserController.find({ name: name });
                if (!userData) throw new Error("user data isn't exist");
            } catch (err) {
                throw new Error("Invalid username");
            }

            try {
                const hashedPassword = getHash(name, password);
                if (userData.password != hashedPassword)
                    throw new Error("Invalid password");
            } catch (err) {
                throw new Error("Invalid password");
            }

            const token = jwt.sign(
                {
                    name: userData.name,
                    address: userData.address,
                    email: userData.email,
                },
                process.env.TOKEN_SECRET,
                {
                    expiresIn: "144h",
                }
            );
            res.status(200).json({ status: true, token: token });
        } catch (err) {
            console.error("Auth/logIn : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    /**
     * update user datas
     * @param { name, email, password, description, links, signature} req
     * @param { *} res
     */
    updateUserData: async (req, res) => {
        try {
            const { name, email, password, description, links, signature } =
                req.body;

            const address = ethers.utils.verifyMessage(
                "welcome " + name,
                signature
            );
            const hashedPassword = getHash(name, password);
            let [imageResult] = await ipfs.files.add(req.files.image.data);
            let [coverImageResult] = await ipfs.files.add(
                req.files.coverImage.data
            );

            let user = await UserController.find({ address: address });
            var checkUser = await UserController.find(
                email ? { email: email } : { name: name }
            );
            // if user exist
            if (user) {
                //if it's not same user
                if (checkUser && checkUser.address != user.address) {
                    throw new Error("Name is Exist");
                }
                await UserController.update(
                    { address: address },
                    {
                        name: name,
                        email: email,
                        hashedPassword: hashedPassword,
                        image: process.env.IPFS_BASEURL + imageResult.hash,
                        coverImage:
                            process.env.IPFS_BASEURL + coverImageResult.hash,
                        description: description,
                        links: JSON.parse(links),
                    }
                );
            } else {
                if (checkUser) {
                    throw new Error("Name is Exist");
                }
                const tmpRef = randomReferralString();
                await UserController.create({
                    name: name,
                    email: email,
                    address: address,
                    hashedPassword: hashedPassword,
                    image: process.env.IPFS_BASEURL + imageResult.hash,
                    coverImage:
                        process.env.IPFS_BASEURL + coverImageResult.hash,
                    description: description,
                    links: JSON.parse(links),
                    referralCode: tmpRef,
                    referrer: "",
                    referrallers: [],
                    referralReward: 0
                });
            }

            user = await UserController.find({ address: address });
            let ranking = await UserController.findRank({ address: address });
            res.json({
                name: user.name,
                email: user.email,
                address: user.address,
                image: user.image,
                coverImage: user.coverImage,
                description: user.description,
                links: user.links,
                merit: user.merit,
                follows: user.followers,
                ranking: ranking,
            });
        } catch (err) {
            console.error("Auth/updateUserData : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    /**
     * check user data validation
     * @param { name, email } req
     * @param { * } res
     */
    checkUserData: async (req, res) => {
        try {
            const { name, email } = req.body;
            var user = await UserController.find(
                email ? { email: email } : { name: name }
            );
            if (user) res.json({ isValid: false });
            else res.json({ isValid: true });
        } catch (err) {
            console.error("Auth/checkUserData : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    /**
     * get user datas
     * @param { address } req
     * @param { * } res
     */
    getUserData: async (req, res) => {
        try {
            const { address } = req.body;
            const user = await UserController.find({ address: address });
            // name,email,address,image,coverImage,description,links,merit,follows
            if (!user) {
                res.json({
                    name: "Player",
                    email: "",
                    address: address,
                    image: "",
                    coverImage: "",
                    description: "",
                    links: [],
                    merit: 0,
                    follows: [],
                    ranking: -1,
                });
            } else {
                let ranking = await UserController.findRank({
                    address: address,
                });
                res.json({
                    name: user.name,
                    email: user.email,
                    address: user.address,
                    image: user.image,
                    coverImage: user.coverImage,
                    description: user.description,
                    links: user.links,
                    merit: user.merit,
                    follows: user.followers,
                    ranking: ranking,
                });
            }
        } catch (err) {
            console.error("Auth/getUserData : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    getAllUserData: async (req, res) => {
        try {
            let users = await UserController.finds();
            users = users.map(user => ({ name: user.name, address: user.address, image: user.image, coverImage: user.coverImage,merit:user.merit }))
            return res.json(users);
        } catch (err) {
            console.log("Auth/getAllUserData : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    getReferrals: async (req, res) => {
        try {
            const { to } = req.body;
            const user = await UserController.find({ address: to });
            if (!user) return res.json({});
            return res.json(({
                name: user.name,
                address: user.address,
                image: user.image,
                coverImage: user.coverImage,
                referrer: user.referrer,
                referralCode: user.referralCode,
                referrallers: user.referrallers,
                referralReward: user.referralReward
            }));
        } catch (err) {
            console.log("Auth/getReferrals : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    getReferrerInfo: async (req, res) => {
        try {
            const { referrers } = req.body;
            let referralers = [];
            if (referrers instanceof Array && referrers.length > 0) {
                for (let i = 0; i < referrers.length; i++) {
                    const ref = await UserController.find({ address: referrers[i] });
                    referralers.push(ref)
                }
            }
            else {
                return res.json([]);
            }
            return res.json(referralers.map(user => (
                { name: user.name, address: user.address, image: user.image, coverImage: user.coverImage }
            )));
        } catch (err) {
            console.log("Auth/getAllUserData : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    claimReward: async (req, res) => {
        try {
            const { user } = req.body;
            const users = await UserController.find({ address: user });
            const result = await ReferralController.create({ user: user, amount: users.referralReward });
            return res.json(result);
        } catch (err) {
            console.log("Auth/claimReward : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    getAlert: async (req, res) => {
        try {
            const { user } = req.body;
            const result = await NotificationController.finds({ user, status: "pending" });
            return res.json(result);
        } catch (err) {
            console.log("Auth/claimReward : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    readAlert: async (req, res) => {
        try {
            const { id } = req.body;
            const result = await NotificationController.update({ _id: id }, { status: "read" });
            return res.json(result);
        } catch (err) {
            console.log("Auth/claimReward : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    like: async (req, res) => {
        try {
            const { to, signature } = req.body;
            const address = await ethers.utils.verifyMessage(to, signature);
            var user = await UserController.find({ address: to });
            if (!user) throw new Error("invalid user");

            let followerIndex = user.followers.findIndex(
                (follower) => follower == address.toUpperCase()
            );
            if (followerIndex != -1) {
                // unlike
                user.followers.splice(followerIndex, 1);
            } else {
                // like
                user.followers = [...user.followers, address.toUpperCase()];
            }

            await UserController.update(
                { address: to },
                { followers: user.followers }
            );
            var user = await UserController.find({ address: to });
            res.status(200).json({ status: true, data: user });
        } catch (err) {
            console.error("gameApi/getUpgradeSign : ", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    /**
     * middleware
     * @param {  authorization } req
     * @param { * } res
     * @param { * } next
     * @returns
     */
    middleware: async (req, res, next) => {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[0];
        if (token == null) return res.sendStatus(401);
        jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
            console.error("Auth/middleware : ", err.message);
            if (err) return res.sendStatus(403);
            const userData = await UserController.find({ name: user.name });
            req.user = userData;
            next();
        });
    },
};


module.exports = AuthApi;