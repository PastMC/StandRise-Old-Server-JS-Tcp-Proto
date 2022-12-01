var net = require('net');
var uuid = require('uuid');
var md5 = require('md5');
var ByteBuffer = require("bytebuffer");
const protobuf = require("protobufjs");
const uuidParse = require('uuid').parse;
const {Uint64BE} = require("int64-buffer");
const mongodb = require("mongoose");
const test = require('util');
const AesEncryption = require('aes-encryption');
"use strict";
var crypto = require("crypto");
const {google} = require('googleapis');
var https = require("https");
const { Stats } = require('fs');
var EncryptionHelper = (function () {

    function getKeyAndIV(key, callback) {

        crypto.pseudoRandomBytes(16, function (err, ivBuffer) {

            var keyBuffer = (key instanceof Buffer) ? key : new Buffer(key);

            callback({
                iv: ivBuffer,
                key: keyBuffer
            });
        });
    }

    function encryptText(cipher_alg, key, iv, text, encoding) {

        var cipher = crypto.createCipheriv(cipher_alg, key, iv);

        encoding = encoding || "binary";

        var result = cipher.update(text, "utf8", encoding);
        result += cipher.final(encoding);

        return result;
    }

    function decryptText(cipher_alg, key, iv, text, encoding) {

        var decipher = crypto.createDecipheriv(cipher_alg, key, iv);

        encoding = encoding || "binary";

        var result = decipher.update(text, encoding);
        result += decipher.final();

        return result;
    }

    return {
        CIPHERS: {
            "AES_128": "aes128",          //requires 16 byte key
            "AES_128_CBC": "aes-128-cbc", //requires 16 byte key
            "AES_192": "aes192",          //requires 24 byte key
            "AES_256": "aes256"           //requires 32 byte key
        },
        getKeyAndIV: getKeyAndIV,
        encryptText: encryptText,
        decryptText: decryptText
    };
})();

module.exports = EncryptionHelper;

const Authenficated = [];
const Lobbyes = [];

//loadProtoFiles 
(async _ => {
   const Rpc = await protobuf.load("RpcMessage.proto");
   const Auth = await protobuf.load("AuthMessage.proto");
   const Settings = await protobuf.load("SettingsMessage.proto");
   const Storage = await protobuf.load("StorageMessage.proto");
   const Inventory = await protobuf.load("InventoryMessage.proto");
   const PlayerMessage = await protobuf.load("PlayerMessage.proto");
   const PlayerStatsMessage = await protobuf.load("PlayerStatsMessage.proto");
   ResponseMessage = Rpc.lookupType("Axlebolt.RpcSupport.Protobuf.ResponseMessage");
   BinaryValue = Rpc.lookupType("Axlebolt.RpcSupport.Protobuf.BinaryValue");
   request = Rpc.lookupType("Axlebolt.RpcSupport.Protobuf.RpcRequest");
   sttring = Rpc.lookupType("Axlebolt.RpcSupport.Protobuf.String");
   Integer = Rpc.lookupType("Axlebolt.RpcSupport.Protobuf.Integer");
   ByteArray = Rpc.lookupType("Axlebolt.RpcSupport.Protobuf.ByteArray");
   handshake = Auth.lookupType("Axlebolt.Bolt.Protobuf2.Handshake");
   googleAuth = Auth.lookupType("Axlebolt.Bolt.Protobuf2.AuthGoogle");
   GameSetting = Settings.lookupType("Axlebolt.Bolt.Protobuf2.GameSetting");
   InventoryItemDefinition = Inventory.lookupType("Axlebolt.Bolt.Protobuf2.InventoryItemDefinition");
   InventoryItemsDefinitions = Inventory.lookupType("Axlebolt.Bolt.Protobuf2.InventoryItemsDefinitions");
   InventoryItemsPropertiesDefinitions = Inventory.lookupType("Axlebolt.Protobuf2.InventoryItemPropertyDefinitions")
   PlayerSame = PlayerMessage.lookupType("Axlebolt.Bolt.Protobuf2.Player");
   Statss = PlayerStatsMessage.lookupType("Axlebolt.Bolt.Protobuf2.Stats");
   PlayerStat = PlayerStatsMessage.lookupType("Axlebolt.Bolt.Protobuf2.PlayerStat");
   StorePlayerStat = PlayerStatsMessage.lookupType("Axlebolt.Bolt.Protobuf2.StorePlayerStat");
   StorageSet = Storage.lookupType("Axlebolt.Bolt.Protobuf2.Storage")
})()
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
var toBytesInt32=function(num) {
    var ascii='';
    for (let i=3;i>=0;i--) {
        ascii+=String.fromCharCode((num>>(8*i))&255);
    }
    return ascii;
};
function int32ToBytes (int) {
  return [
    int & 0xff,
    (int >> 8) & 0xff,
    (int >> 16) & 0xff,
    (int >> 24) & 0xff
  ]
}
var fromBytesInt32=function(numString) {
    var result=0;
    for (let i=3;i>=0;i--) {
        result+=numString.charCodeAt(3-i)<<(8*i);
    }
    return result;
};
function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}
function writeProtoResponce(socket,guid,result, exeption) {
    var payload = { rpcResponse: {id:guid, exception: exeption, return: result }, eventResponse: null };
    var message = ResponseMessage.create(payload);
    var buffer = ResponseMessage.encode(message).finish();
    //console.log(buffer.length);
    var buffer2 = Buffer.from(int32ToBytes(buffer.length).reverse());
    //console.log(fromBytesInt32(hex2a(buffer2.toString('hex',0,4))))
    return socket.write(Buffer.concat([buffer2, buffer]));
}
function convertGuidToInt(uuid) {
    let parsedUuid = uuidParse(uuid);
    let buffer = Buffer.from(parsedUuid);
    const big = new Uint64BE(buffer);
    return big;
}
function updateTime() {
    if (Authenficated.length > 1) {
    for (let time = 0;time < Authenficated.length; time++) {
        Authenficated[time].timeInGame++;
    }
    console.log(Authenficated.length);
    }
}
async function saveTime(PlayerToken,timeInGame) {
    const tes1 = mongodb.connection.useDb("privatev1");
    const PlayersSchema = mongodb.Schema({
        Token: String,
        TimeInGame: Number
    }, { collection: 'Players2' });
    const Players = tes1.model('Players2', PlayersSchema);
    const getDocument = async () => {
    const doc = await Players.findOne({ Token: PlayerToken });
    await doc.updateOne({ Token: PlayerToken }, { TimeInGame: timeInGame });
    doc.TimeInGame = timeInGame;
    await doc.save();
    };
    getDocument();
}
async function Handshake(socket, ServiceValue, Guid) {
    const tes1 = mongodb.connection.useDb("privatev1");
    const test = tes1.collection("Players2");
        const getDocument = async () => {
            const token = handshake.decode(ServiceValue[0].one).ticket;
            const kg = await test.countDocuments({ Token: token });
            const kg2 = await test.findOne({ Token: token });
            if (kg == 0) {
                return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 2003,params: null });
            } else {
                const ivan = { socket: socket, Token: token,Hwid: kg2.LastHwid ,timeInGame: kg2.TimeInGame};
                if (Authenficated.indexOf(ivan) == -1) {
                    Authenficated.push(ivan);
                    return writeProtoResponce(socket,Guid,{isNull: true},null);
                } else {
                    return writeProtoResponce(socket,Guid,{isNull: true},null);
                }
            }
        };

        getDocument();
    
}
async function BanMe(socket,Guid,ServieValue) {

    const tt = mongodb.connection.useDb("privatev1");
    const PlayersSchema = mongodb.Schema({
        PlayerUid: String,
        Name: String,
        Token: String,
        LastHwid: String,
        IsBanned: Boolean,
        BanCode: String,
        BanReason: String
    }, { collection: 'Players2' });

    const Players = tt.model('Players2', PlayersSchema);
    const HwidSchema = mongodb.Schema({
        Hwid: String,
        IsBanned: Boolean
    }, { collection: 'Hwids2' });

    const Hwids = tt.model('Hwids2', HwidSchema);
    const clientId = "";
    for (var temp = 0; temp < Authenficated.length; temp++) {
        if (Authenficated[temp].socket == socket) {
            const gay = Authenficated[temp]['Token'];
            // //console.log(gay);
            const getDocument = async () => {
                const results = await Players.findOne({ Token: gay });
                const gay2 = results.LastHwid;
                await results.updateOne({ LastHwid: gay }, { IsBanned: true });
                results.IsBanned = true;
                results.BanCode = Integer.decode(ServiceValue[0].one).value;
                results.BanReason = sttring.decode(ServiceValue[1].one).value;
                await results.save();
                const results2 = await Hwids.findOne({ Hwid: gay2 });
                await results2.updateOne({ Hwid: gay }, { IsBanned: true });
                results2.IsBanned = true;
                await results2.save();
                return writeProtoResponce(socket,Guid,{isNull: true},null);
            };

            getDocument();
            return;
        }
    }
    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });

}
async function GoogleAuth(socket, ServiceValue, Guid) {
    const tes1 = mongodb.connection.useDb("privatev1");
    const test2 = tes1.collection("Players2");
    const test3 = tes1.collection("GameSettings");
    const soska = tes1.collection("Hwids2");
    const skit = tes1.collection("Hashes");
    const PlayersSchema = mongodb.Schema({
        PlayerUid: String,
        OriginalUid: Number,
        Name: String,
        AuthToken: String,
        Token: String,
        LastHwid: String
    }, { collection: 'Players2' });

    const Players = tes1.model('Players2', PlayersSchema);
    const jsonObj = googleAuth.decode(ServiceValue[0].one);
    //console.log(jsonObj)
    //console.log(ServiceValue)
    if (jsonObj.length != 0) {
        const getDocument = async () => {
        	const oauth2Client = new google.auth.OAuth2(
  "248935910126-dvb39tgojf5ol76hh2kcu76ikvna94ea.apps.googleusercontent.com",
  "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"
);
            

                let { tokens } = await oauth2Client.getToken(jsonObj.authCode);
                //console.log(tokens)
                //console.log(JSON.stringify(tokens))
                const output = {};
                oauth2Client.setCredentials(tokens);
                var oauth2 = google.oauth2({
  auth: oauth2Client,
  version: 'v2'
});
const info = await oauth2.userinfo.v2.me.get();
//console.log(info);
                const abobas = info.data.id;
                const kgh = await soska.countDocuments({ Hwid: jsonObj.verification.DeviceId });
        if (kgh == 0) {
            var data = {
                "Hwid": jsonObj.verification.DeviceId,
                "IsBanned": false
            }
            await soska.insertOne(data);
        }
            const kg = await test2.countDocuments({ AuthToken: abobas });
            if (kg == 0) {
                var date = new Date()
                var ticks = date.getTime()
                const nng = await Players.find({},{});
                const nn = nng[nng.length - 1].OriginalUid + 1;
                var data = {
                    "Avatar": "",
                    "AvatarId": "",
                    "PlayerUid": "" + nn,
                    "Id": md5(nn),
                    "OriginalUid": nn,
                    "Name": "TK_" + getRandomInt(9999),
                    "PlayInGame": null,
                    "PlayerStatus": { "PlayInGame": null, "OnlineStatus": 0x0 },
                    "RegistrationDate": ticks,
                    "TimeInGame": 0,
                    "AuthToken": abobas,
                    "Token": md5(abobas),
                    "LastHwid": jsonObj.verification.DeviceId,
                    "NoDetectRoot": false,
                    "IsBanned": false,
                    "BanCode": "",
                    "BanReason": "",
                    "Stats": {
                    
                        "arrayCust": [
                            {
                                "name": "defuse_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_deaths",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_assists",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "defuse_games_played",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_deaths",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_assists",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "deathmatch_games_played",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "level_xp",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "level_id",
                                "IntValue": 1,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_g22_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_g22_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_g22_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_g22_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_g22_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_usp_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_usp_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_usp_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_usp_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_usp_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p350_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p350_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p350_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p350_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p350_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_deagle_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_deagle_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_deagle_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_deagle_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_deagle_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_ump45_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_ump45_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_ump45_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_ump45_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_ump45_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_mp7_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_mp7_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_mp7_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_mp7_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_mp7_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p90_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p90_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p90_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p90_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_p90_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr12_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr12_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr12_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr12_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_akr12_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m4_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m4_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m4_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m4_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m4_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m16_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m16_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m16_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m16_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m16_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_famas_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_famas_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_famas_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_famas_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_famas_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_awm_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_awm_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_awm_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_awm_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_awm_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m40_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m40_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m40_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m40_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_m40_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_sm1014_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_sm1014_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_sm1014_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_sm1014_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_sm1014_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knife_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knife_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knife_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knife_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knife_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebayonet_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebayonet_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebayonet_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebayonet_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebayonet_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifekarambit_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifekarambit_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifekarambit_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifekarambit_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifekarambit_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebutterfly_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebutterfly_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebutterfly_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebutterfly_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_knifebutterfly_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_jkommando_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_jkommando_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_jkommando_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_jkommando_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_defuse_jkommando_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_g22_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_g22_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_g22_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_g22_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_g22_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_usp_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_usp_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_usp_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_usp_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_usp_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p350_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p350_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p350_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p350_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p350_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_deagle_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_deagle_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_deagle_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_deagle_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_deagle_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_ump45_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_ump45_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_ump45_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_ump45_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_ump45_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_mp7_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_mp7_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_mp7_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_mp7_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_mp7_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p90_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p90_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p90_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p90_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_p90_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr12_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr12_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr12_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr12_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_akr12_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m4_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m4_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m4_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m4_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m4_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m16_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m16_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m16_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m16_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m16_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_famas_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_famas_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_famas_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_famas_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_famas_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_awm_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_awm_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_awm_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_awm_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_awm_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m40_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m40_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m40_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m40_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_m40_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_sm1014_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_sm1014_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_sm1014_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_sm1014_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_sm1014_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knife_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knife_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knife_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knife_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knife_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebayonet_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebayonet_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebayonet_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebayonet_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebayonet_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifekarambit_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifekarambit_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifekarambit_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifekarambit_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifekarambit_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebutterfly_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebutterfly_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebutterfly_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebutterfly_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_knifebutterfly_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_jkommando_kills",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_jkommando_damage",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_jkommando_headshots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_jkommando_hits",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "gun_deathmatch_jkommando_shots",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "ranked_rank",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "ranked_current_mmr",
                                "IntValue": 500,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "ranked_ban_code",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "ranked_ban_duration",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "ranked_calibration_match_count",
                                "intValue": 0,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            },
                            {
                                "name": "ranked_last_match_status",
                                "IntValue": 1,
                                "floatValue": 0.0,
                                "window": 0.0,
                                "type": "INT"
                            }
                            
                        ]
                        
                    },
                    "FileStorage": [
                        {
                            "filename": "ranked_last_room_id",
                            "file": [
                                123,
                                34,
                                76,
                                97,
                                115,
                                116,
                                82,
                                111,
                                111,
                                109,
                                73,
                                100,
                                34,
                                58,
                                34,
                                34,
                                44,
                                34,
                                76,
                                97,
                                115,
                                116,
                                82,
                                101,
                                103,
                                105,
                                111,
                                110,
                                34,
                                58,
                                34,
                                34,
                                125
                            ]
                        }
                    ]
                }
                await test2.insertOne(data);
                const newtoken = md5(abobas);
                const res = await test2.findOne({ Token: newtoken }, {});
                const res2 = await test3.findOne({}, {});
                const ress = await soska.findOne({ Hwid: jsonObj.verification.DeviceId }, {});
                const kgh = await skit.countDocuments({ version: jsonObj.gameVersion});
        if (kgh == 0) {
            return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 2000,property: null });
        }
                const hash = await skit.findOne({version: jsonObj.gameVersion},{})
                if (res.IsBanned == true) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 9999,property: {banCode: res.BanCode,reason: res.BanReason,uid: res.PlayerUid}});
                }
                                if (hash.hash != jsonObj.verification.ApkHash || hash.signature != jsonObj.verification.Signature) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1001,property: null });
                }
                if (jsonObj.verification.IsRooted == true && res.NoDetectRoot == false) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1003,property: null });
                }
                if (ress.IsBanned == true) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1007,property: null });
                }
                if (jsonObj.verification.AllApps.length < 10 ) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1003,property: null });
                }
                return writeProtoResponce(socket,Guid,{isNull: false, one: sttring.encode({value: newtoken}).finish() },null);
            } else {
                var date = new Date()
                var ticks = date.getTime()
                const newtoken = md5(abobas + ticks);
                const doc = await Players.findOne({ AuthToken: abobas });
                await doc.updateOne({ AuthToken: abobas }, { Token: newtoken });
                doc.Token = newtoken;
                doc.LastHwid = jsonObj.verification.DeviceId;
                await doc.save();
                const res = await test2.findOne({ Token: newtoken }, {});
                const res2 = await test3.findOne({}, {});
                const ress = await soska.findOne({ Hwid: jsonObj.verification.DeviceId }, {});
                const kgh = await skit.countDocuments({ version: jsonObj.gameVersion});
        if (kgh == 0) {
            return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 2000,property: null });
        }
                const hash = await skit.findOne({version: jsonObj.gameVersion},{})
                if (res.IsBanned == true) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 9999,property: {banCode: res.BanCode,reason: res.BanReason,uid: res.PlayerUid}});
                }
                if (hash.hash != jsonObj.verification.ApkHash || hash.signature != jsonObj.verification.Signature) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1001,property: null });
                }
                if (jsonObj.verification.IsRooted == true && res.NoDetectRoot == false) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1003,property: null });
                }
                if (ress.IsBanned == true) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1007,property: null });
                }
                if (jsonObj.verification.AllApps.length < 10 ) {
                    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 1003,property: null });
                }
                writeProtoResponce(socket,Guid,{isNull: false, one: sttring.encode({value: newtoken}).finish() },null)
            }
            
        };

        getDocument();
    }
}
async function ItemsDefinitions(socket, Guid) {
    const tes1 = mongodb.connection.useDb("privatev1");
    const test = tes1.collection("Inventory");
    const getDocument = async () => {
        const result = await test.find().toArray();
        const papa = result[0].customskins;
        const stringArray = []
        for (var tester = 0; tester < papa.length; tester++) {
            const gg = {id: papa[tester].id, displayName: papa[tester].displayName,properties: {value: papa[tester].properties.value, stattrack: papa[tester].properties.stattrack,collection: papa[tester].properties.collection}}
            stringArray.push(gg)
        }
        return writeProtoResponce(socket,Guid,{isNull: false, one:InventoryItemsDefinitions.encode(InventoryItemsDefinitions.fromObject({definitions: stringArray})).finish() },null);
    };

    getDocument();
}
async function ItemsPropertiesDefinitions(socket,Guid) {
    
    const tes1 = mongodb.connection.useDb("privatev1");
    const test = tes1.collection("Inventory");
    const getDocument = async () => {
        const result = await test.find().toArray();
        const papa = result[0].skitnsProperties;
        const stringArray = []
        for (var tester = 0; tester < papa.length; tester++) {
            stringArray.push(InventoryItemsPropertiesDefinitions.encode(InventoryItemsPropertiesDefinitions.fromObject(papa[tester])).finish())
        }
        return writeProtoResponce(socket,Guid,{isNull: false, array:stringArray },null);
    };

    getDocument();
}
async function SetName(socket, ServiceValue, Guid) {
    const tes1 = mongodb.connection.useDb("privatev1");
    const PlayersSchema = mongodb.Schema({
        PlayerUid: String,
        OriginalUid: String,
        Name: String,
        Token: String
    }, { collection: 'Players2' });

    const Players = tes1.model('Players2', PlayersSchema);
    const getDocument = async () => {

        for (var temp = 0; temp < Authenficated.length; temp++) {
            if (Authenficated[temp].socket == socket) {
                const gay = Authenficated[temp]['Token'];
                const doc = await Players.findOne({ Token: gay });
                await doc.updateOne({ Token: gay }, { Name: sttring.decode(ServiceValue[0].one).value });
                doc.Name = sttring.decode(ServiceValue[0].one).value;
                await doc.save();
                return writeProtoResponce(socket,Guid,{isNull: true },null);
            }
        }
        return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });
    };

    getDocument();

}
async function GetPalyer(socket, Guid) {
    const tes1 = mongodb.connection.useDb("privatev1");
    const test2 = tes1.collection("Players2"); 
    const getDocument = async () => {
        for (var temp = 0; temp < Authenficated.length; temp++) {
            if (Authenficated[temp].socket == socket) {
                //console.log(Authenficated[temp]['Token']);
                const gay = Authenficated[temp]['Token'];

                const doc = await test2.findOne({ Token: gay });
                const stringArray = {id: doc.Id, uid: doc.PlayerUid, name: doc.Name, avatarId: doc.AvatarId, timeInGame: doc.TimeInGame, PlayerStatus: null, logoutDate: null,registrationDate: doc.RegistrationDate };
                return writeProtoResponce(socket,Guid,{isNull: false, one:PlayerSame.encode(stringArray).finish() },null);
            }
        }
        return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });
    };

    getDocument();
}
async function StoreStats(socket, Guid, ServiceValue) {

    const tes1 = mongodb.connection.useDb("privatev1");
    const PlayersSchema = mongodb.Schema({
        Token: String,
        Stats: {
           arrayCust: Array
        }
    }, { collection: 'Players2' });
    const Players = tes1.model('Players2', PlayersSchema);
    const jsonObj = [];
    for (var skit = 0; skit < ServiceValue[0].array.length; skit++) {
    jsonObj.push(StorePlayerStat.decode(ServiceValue[0].array[skit]));
    }
    //console.log(jsonObj)
    //console.log(ServiceValue)
    if (jsonObj.length != 0) {
        const getDocument = async () => {
            for (var temp = 0; temp < Authenficated.length; temp++) {
                if (Authenficated[temp].socket == socket) {
                    const result = await Players.findOne({ Token: Authenficated[temp].Token });
                    const aboab = jsonObj;
                    if (aboab != null) {
                        for (var lengthh = 0; lengthh < aboab.length; lengthh++) {
                            const pusher = { name: aboab[lengthh].name, intValue: aboab[lengthh].StoreInt, floatValue: 0, window: 0.0, type: 'INT' };
                            const audioIndex = result.Stats.arrayCust.map(result => result.name).indexOf(pusher.name);
                            result.Stats.arrayCust[audioIndex] = pusher;
                            result.markModified('Stats');
                            await result.save();
                        }
                    }
                    return writeProtoResponce(socket,Guid,{isNull: true },null);
                }
            }
            return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });
            //const testt = "test";

        };

        getDocument();
    }
}
async function ReadAllFiles(socket, Guid) {

    const tes1 = mongodb.connection.useDb("privatev1");
    const test = tes1.collection("Players2");
    const getDocument = async () => {
        for (var temp = 0; temp < Authenficated.length; temp++) {
            if (Authenficated[temp].socket == socket) {
                const result = await test.findOne({ Token: Authenficated[temp].Token }, {});
                const Array = result.FileStorage 
                const stringArray = []
                for (var tester = 0; tester < Array.length; tester++) {
                    const rets = {filename: Array[tester].filename, file: ByteBuffer.fromHex(Buffer.from(Array[tester].file).toString('hex')).buffer}
                    stringArray.push(StorageSet.encode(rets).finish())
                }
                return writeProtoResponce(socket,Guid,{isNull: false, array: stringArray },null);
            }
        }
        return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });
        //const testt = "test";

    };

    getDocument();
}
async function WriteFile(socket, Guid,ServiceValue) {

    const tes1 = mongodb.connection.useDb("privatev1");
    const PlayersSchema = mongodb.Schema({
        PlayerUid: String,
        OriginalUid: String,
        Name: String,
        Token: String,
        FileStorage: Array
    }, { collection: 'Players2' });

    const Players = tes1.model('Players2', PlayersSchema);
    const test = tes1.collection("Players2");
            const getDocument = async () => {
            for (var temp = 0; temp < Authenficated.length; temp++) {
                if (Authenficated[temp].socket == socket) {
                    const result = await Players.findOne({ Token: Authenficated[temp].Token }, {});
                    const audioIndex = result.FileStorage.map(result => result.filename).indexOf(sttring.decode(ServiceValue[0].one).value);
                    //console.log(ByteArray.decode(ServiceValue[1].one).value);
                    result.FileStorage[audioIndex].file = Array.prototype.slice.call(ByteArray.decode(ServiceValue[1].one).value);
                    result.markModified('FileStorage');
                    result.save();
                    return writeProtoResponce(socket,Guid,{isNull: true },null);
                }
            }
            return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });

        };

        getDocument();
    
}
async function GetStats(socket, Guid) {

    const tes1 = mongodb.connection.useDb("privatev1");
    const test = tes1.collection("Players2");
    const getDocument = async () => {
        for (var temp = 0; temp < Authenficated.length; temp++) {
            if (Authenficated[temp].socket == socket) {
                const result = await test.findOne({ Token: Authenficated[temp].Token }, {});
                const aer = result.Stats.arrayCust;
                //console.log(PlayerStat.fromObject(aer[0]))
                const gooo = [];
                for (let gay = 0;gay < aer.length;gay++) {
                    gooo.push(PlayerStat.fromObject(aer[gay]))
                }
                //console.log(BinaryValue.fromObject({isNull: false, one: Statss.encode(Statss.fromObject({stat : gooo, achievement : null})).finish() }));
        return writeProtoResponce(socket,Guid,{isNull: false, one: Statss.encode(Statss.fromObject({stat : gooo, achievement : null})).finish() },null);
        }
    }
    return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });
        //const testt = "test";

    };

    getDocument();
}
async function GameSettingsEncrypted(socket,Guid) {

    const tes1 = mongodb.connection.useDb("privatev1");
    const test = tes1.collection("GameSettings");
    const getDocument = async () => {
        const result = await test.findOne({}, {});
        const testt = result.Settings;
        //console.log(testt)
        for (var temp = 0; temp < Authenficated.length; temp++) {
            if (Authenficated[temp].socket == socket) {
                //const key = "Zq4t7w!z%C*F-JaNdRgUkXp2r5u8x/A?";
                //var iv = key.slice(0, 16);
                const arrays = [];
                for (var tester = 0; tester < testt.length; tester++) {
                    arrays.push(GameSetting.encode(testt[tester]).finish())
                }
                /*var algorithm = EncryptionHelper.CIPHERS.AES_256;
                var encText = EncryptionHelper.encryptText(algorithm, key, iv, JSON.stringify(arrays), "base64");*/
                return writeProtoResponce(socket,Guid,{isNull: false, array:arrays },null);
            }
        }
        return writeProtoResponce(socket,Guid,null,{id: convertGuidToInt(Guid),code: 401,params: null });
    };

    getDocument();
}
var server = net.createServer(function (socket) {
    socket.on('error', (err) => {
        for (var temp = 0; temp < Authenficated.length; temp++) {
            ////console.log(clientListName.length);
            ////console.log(clientListName[temp]);
            if (Authenficated[temp].socket == socket) {
                try {
                    saveTime(Authenficated[temp]['Token'],Authenficated[temp]['timeInGame']);
                } catch (err) {
                    //console.log(err);
                }
                Authenficated.splice(temp, 1);
                break;
            }
        }
        socket.end(err.stack);
    });
    socket.on('end', () => {
        for (var temp = 0; temp < Authenficated.length; temp++) {
            ////console.log(clientListName.length);
            ////console.log(clientListName[temp]);
            if (Authenficated[temp].socket == socket) {
                try {
                    saveTime(Authenficated[temp]['Token'],Authenficated[temp]['timeInGame']);
                } catch (err) {
                    //console.log(err);
                }
                Authenficated.splice(temp, 1);
                break;
            }
        }
    });
    socket.on('close', () => {
        for (var temp = 0; temp < Authenficated.length; temp++) {
            ////console.log(clientListName.length);
            ////console.log(clientListName[temp]);
            if (Authenficated[temp].socket == socket) {
                
                try {
                    saveTime(Authenficated[temp]['Token'],Authenficated[temp]['timeInGame']);
                } catch (err) {
                    //console.log(err);
                }
                Authenficated.splice(temp, 1);
                break;
            }
        }
    });
    socket.on('data', (data) => {
        //writeProtoResponce(socket,uuid.v4(),{isNull: true},{id: convertGuidToInt(uuid.v4()),code: 228, property:{banId: "gay", banReasone: "gay", banCode: "234"}});
        const lengthrequest = fromBytesInt32(hex2a(data.toString('hex',0,4)));
        if (lengthrequest != null) {
            if (lengthrequest == 1) {
                
                var buffer2 = Buffer.from(toBytesInt32(1));
                var buffer = Buffer.from("01", 'hex');
    return socket.write(Buffer.concat([buffer2, buffer]));
            }
        //console.log(lengthrequest);
        const message = data.slice(4, lengthrequest + 4);
        //console.log(message)
        const dec = request.decode(message);
        //console.log(dec);
        const Guid = dec.id;
        if (dec.serviceName == "StorageRemoteService") {
                    if (dec.methodName == "readAllFiles") {
                        try {
                            ReadAllFiles(socket, Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "writeFile") {
                        const ServiceValue = dec.params;
                        try {
                            WriteFile(socket,Guid, ServiceValue);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                }
                if (dec.serviceName == "PlayerStatsRemoteService") {
                    if (dec.methodName == "getStats") {
                        try {
                            GetStats(socket, Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "storeStats") {
                        const ServiceValue = dec.params;
                        try {
                            StoreStats(socket, Guid, ServiceValue);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                }
                if (dec.serviceName == "PlayerRemoteService") {
                    if (dec.methodName == "setOnlineStatus") {
                        writeProtoResponce(socket,Guid,{isNull: true},null);
                    }
                    if (dec.methodName == "setAwayStatus") {
                        writeProtoResponce(socket,Guid,{isNull: true},null);
                    }
                    if (dec.methodName == "banMe") {
                        const ServiceValue = dec.params;
                        try {
                            BanMe(socket,Guid,ServiceValue);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "getPlayer") {
                        try {
                            GetPalyer(socket, Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "setPlayerName") {
                        const ServiceValue = dec.params;
                        try {
                            SetName(socket, ServiceValue, Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                }
                if (dec.serviceName == "InventoryRemoteService") {
                    if (dec.methodName == "getInventoryItemDefinitions") {
                        try {
                            ItemsDefinitions(socket, Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "getInventoryItemPropertyDefinitions") {
                        try {
                            ItemsPropertiesDefinitions(socket, Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                }
                if (dec.serviceName == "GameSettingsRemoteService") {
                    if (dec.methodName == "getGameSettingsEncrypted") {
                        try {
                            GameSettingsEncrypted(socket,Guid);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                }
                if (dec.serviceName == "GoogleAuthRemoteService") {
                    if (dec.methodName == "protoAuth") {
                        const ServiceValue = dec.params;
                        try {
                            GoogleAuth(socket, ServiceValue, Guid);
                        } catch (err) {
                            //console.log(err);
                        }

                    }
                }
                if (dec.serviceName == "HandshakeRemoteService") {
                    if (dec.methodName == "protoHandshake") {
                        const ServiceValue = dec.params;
                        try {
                            Handshake(socket, ServiceValue, Guid);
                        } catch (err) {
                            //console.log(err);
                        }

                    }
                }
               /* if (str.search("GameRemoteService") == 40) {
                    if (dec.methodName == "CreateLobby") {
                        const ServiceValue = dec.params;
                        try {
                            CreateLobby(socket, ServiceValue);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "CheckLobbyData") {
                        try {
                            CheckLobbyData(socket);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                    if (dec.methodName == "JoinLobby") {
                        const ServiceValue = dec.params;
                        try {
                            JoinLobby(socket,ServiceValue);
                        } catch (err) {
                            //console.log(err);
                        }
                    }
                }*/
                   
            }
    });
});
server.listen(2222, '<Your IP>');
async function ConnectMongo() {
    await mongodb.connect('mongodb://<YOUR MONGO>/admin');
}
ConnectMongo();
setInterval(updateTime,1000);
process.on('uncaughtException', function (err) { console.log(err); var stack = err.stack; });
