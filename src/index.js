const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const request = require('request')
const config = require('./config')
const helper = require('./helper')
const keyboard = require('./keyboard')
const kb = require('./keyboard-buttons')


helper.logStart()

mongoose.Promise = global.Promise

mongoose.connect(config.DB_URL, {
        useMongoClient: true
    })
    .then(() => console.log('Успешное подключение к БД'))
    .catch((err) => console.log(err))

require('./model/shadowing.model')

const Shadowing = mongoose.model('shadowing')


const bot = new TelegramBot(config.TOKEN, {
    polling: true
})


bot.onText(/\/start/, msg => {

    const text = 'Приветик! Чё будуем делать?'

    bot.sendMessage(helper.getChatId(msg), text, {
        reply_markup: {
            keyboard: keyboard.home
        }
    })


})


bot.on('message', msg => {

    const chatId = helper.getChatId(msg)

    switch (msg.text) {
    case kb.locations:
        bot.sendMessage(chatId, 'Введи имя жертвы:', {
            reply_markup: {
                force_reply: true
            }
        })
        break
    case kb.shadowing:
        bot.sendMessage(chatId, 'За кем следим?', {
            reply_markup: {
                force_reply: true
            }
        })
        break
    }

    //*************************************************
    //ОПРЕДЕЛЕНИЕ ЛОКАЦИИ
    //*************************************************

    if (msg.reply_to_message && msg.reply_to_message.text == 'Введи имя жертвы:') {
        const nickname = encodeURI(msg.text)
        const url = config.API_URL_LOC + nickname
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                data = JSON.parse(body)
                location = data.location
                r = data.r
                if (r != 'fail') {
                    bot.sendMessage(chatId, location, {
                        reply_markup: {
                            keyboard: keyboard.home
                        }
                    })
                } else {
                    bot.sendMessage(chatId, 'Нет такого игрока', {
                        reply_markup: {
                            keyboard: keyboard.home
                        }
                    })
                }
            } else {
                bot.sendMessage(chatId, 'Произошла ошибка', {
                    reply_markup: {
                        keyboard: keyboard.home
                    }
                })
            }
        })
    }

    //*************************************************
    //КОНЕЦ ОПРЕДЕЛЕНИЕ ЛОКАЦИИ
    //*************************************************
    else if (msg.reply_to_message && msg.reply_to_message.text == 'За кем следим?') {
        const nickname = encodeURI(msg.text)
        const url = config.API_URL_LOC + nickname
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                data = JSON.parse(body)
                location = data.location
                r = data.r
                if (r != 'fail') {


                    Shadowing.findOne({
                        nickname: msg.text
                    }, function (err, shadowing) {

                        if (shadowing != null) {


                            elem = shadowing.chatId.indexOf(chatId)

                            if (elem != -1) {

                                Shadowing.update({
                                    nickname: msg.text
                                }, {
                                    $pop: {
                                        chatId: -elem
                                    }
                                }, function (err, result) {
                                    if (err) return console.log(err);
                                    console.log(result);
                                });

                                bot.sendMessage(chatId, msg.text + ' удален из списка отслеживаемых! ', {
                                    reply_markup: {
                                        keyboard: keyboard.home
                                    }
                                })

                            } else {

                                Shadowing.update({
                                    nickname: msg.text
                                }, {
                                    $push: {
                                        chatId: chatId
                                    }
                                }, function (err, result) {
                                    if (err) return console.log(err);
                                    console.log(result);
                                })

                                bot.sendMessage(chatId, msg.text + ' успешно добавлен в список отслеживаемых! ')
                                bot.sendMessage(chatId, 'Текущее местоположение: ' + location, {
                        reply_markup: {
                            keyboard: keyboard.home
                        }
                    })
                            }

                        } else {

                            newShadowing = new Shadowing({
                                nickname: msg.text
                                , chatId: chatId
                                , lastStatus: location
                            })

                            newShadowing.save(function (err, newShadowing) {
                                if (err) {
                                    bot.sendMessage(chatId, 'Ошибка ебаная')

                                } else {
                                    bot.sendMessage(chatId, msg.text + ' успешно добавлен в список отслеживаемых! ')
                                    bot.sendMessage(chatId, 'Текущее местоположение: ' + location, {
                        reply_markup: {
                            keyboard: keyboard.home
                        }
                    })
                                }
                            });
                        }
                    })

                } else {
                    bot.sendMessage(chatId, 'Нет такого игрока', {
                        reply_markup: {
                            keyboard: keyboard.home
                        }
                    })
                }
            } else {
                bot.sendMessage(chatId, 'Произошла ошибка', {
                    reply_markup: {
                        keyboard: keyboard.home
                    }
                })
            }
        })
    }
})

//=============================
function check() {
    Shadowing.find({}, function (err, docs) {

        if (err) return console.log(err)

        for (var i = 0, len = docs.length; i < len; i++) {

            const nickname = encodeURI(docs[i].nickname)
            const last_app = docs[i].lastStatus
            const chatList = docs[i].chatId
            const url = config.API_URL_LOC + nickname

            request(url, function (error, response, body) {
                data = JSON.parse(body)
                location = data.location
                r = data.r
                if (location != last_app) {

                    for (var i = 0, len = chatList.length; i < len; i++) {

                        const idChat = chatList[i]

                        Shadowing.update({
                            nickname: decodeURI(nickname)
                        }, {
                            lastStatus: location
                        }, function (err, result) {

                            if (err) return console.log(err)
                            console.log(result)
                        })

                        bot.sendMessage(idChat, decodeURI(nickname) + ': ' + location, {
                            reply_markup: {
                                keyboard: keyboard.home
                            }
                        })
                    }


                }
            })
        }


    })
}
setInterval(check, 100000)