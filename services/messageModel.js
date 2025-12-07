import express from 'express'


const messageSchema = new mongoose.Schema({
    name:{type:String, required: true },
    email:{type:String, required: true, unique:true},
    message: {type:String, required:true, trim:true, minlength: 10},
    createAt: {type:Date, default: Date.now()}
})