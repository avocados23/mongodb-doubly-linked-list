const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const DoublyLinkedList = require('./linkedlist.model');

/**
 * Example object design visualization:
 *
 * {
 *      ...,
 *      doublyLinkedList: [HEAD -> node <-> node <-> node <- TAIL]
 *      ...
 * }
 * 
 */

const exampleSchema = new Schema({
    doublyLinkedList: { type: DoublyLinkedList }
});

const Example = mongoose.model('example', exampleSchema);
module.exports = Example;