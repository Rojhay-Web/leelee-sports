module.exports = {
    SUCCESS:{
        OK:200,
        CREATED:201
    },
    ERROR:{
        BAD_REQUEST:400,
        UNAUTHORIZED:401,
        RATE_LIMIT: 429
    },
    SERVER_ERROR:{
        INTERNAL:500,
        UNAVAILABLE:503
    }
}