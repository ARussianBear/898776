module.exports = {
    
    logStart(){
        console.log('Бот запустился')
    },
    getChatId(msg){
        return msg.chat.id
    },
    
}