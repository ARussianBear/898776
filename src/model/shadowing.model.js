const mongoose = require('mongoose')
const Schema = mongoose.Schema

const shadowingSchema = new Schema({
    nickname: {
        type: String
        , required: true
    }
    , chatId: {
        type: [Number]
        , default: []
        , required: true

    }
    , lastStatus: {
        type: String
        , required: true

    }
, })

mongoose.model('shadowing', shadowingSchema)