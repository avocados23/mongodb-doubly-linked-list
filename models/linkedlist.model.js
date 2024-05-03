const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = require('mongodb').ObjectId;

/**
 * To understand the architecture of how my doubly linked-list implementation works,
 * documents ITSELF are not nodes. Rather, the doubly linked-list is a field for a document.
 * Refer to the example schema file (example.model.js) to see how this works.
 */

const nodeSchema = new Schema({
    dataId: { type: ObjectId, required: true },
    prevNodeType: { type: String, default: '', required: true },
    prevNodeDataId: { type: ObjectId, default: null, required: true },
    nextNodeType: { type: String, default: '', required: true },
    nextNodeDataId: { type: ObjectId, default: null, required: true },
    type: { type: String, required: true, default: 'nodes' }
});

const doublyLinkedListSchema = new Schema({
    nodes: { type: [nodeSchema], default: [] },
    headNodeType: { type: String, default: '' },
    headNodeDataId: { type: ObjectId, required: null },
    tailNodeType: { type: String, default: '' },
    tailNodeDataId: { type: ObjectId, required: null },
    listLength: { type: Number, default: 0, required: true }
});

const DoublyLinkedList = mongoose.model('example', doublyLinkedListSchema);
module.exports = DoublyLinkedList;