require('dotenv').config();
const Example = require('./models/example.model');

const fieldName = process.env.DOUBLY_LL_FIELD_NAME;

async function findNode({uuid, node}) {
    const pipeline = [
        {
          '$match': {
            '_id': uuid
          }
        }, {
          '$project': {
            [`${fieldName}.${node.type}`]: 1,
            [`${fieldName}.listLength`]: 1,
            '_id': 0
          }
        },
        {
            '$addFields': {
                [`${fieldName}.${node.type}.listLength`]: [`${fieldName}.listLength`]
            }
        }, 
        {
          '$replaceRoot': {
            'newRoot': `$${fieldName}`
          }
        }, {
          '$unwind': {
            'path': `$${node.type}`
          }
        }, {
          '$replaceRoot': {
            'newRoot': `$${node.type}`
          }
        }, {
          '$match': {
            'dataId': node.dataId
          }
        }
    ];
    const result = await Example.aggregate(pipeline);
    if (result.length > 0) return result[0];
    return null;
};

/**
 * Returns the head of the list.
 * @param {*} uuid 
 * @returns head of the list
 */
module.exports.head = async function(uuid) {
    const result = await Example.findById(uuid, { _id: 0, [`${fieldName}`]: 1});
    return {
        dataId: result[`${fieldName}`]?.headNodeDataId,
        type: result[`${fieldName}`]?.headNodeType,
        listLength: result[`${fieldName}`]?.listLength
    };
};

/**
 * Returns the tail of the list.
 * @param {*} uuid 
 * @returns tail of the list
 */
module.exports.tail = async function(uuid) {
    const result = await Example.findById(uuid, { _id: 0, [`${fieldName}`]: 1});
    return {
        dataId: result[`${fieldName}`]?.tailNodeDataId,
        type: result[`${fieldName}`]?.tailNodeType
    };
};

/**
 * Sets the head node in the linked list.
 * @param {ObjectId} uuid
 * The linked list associated with the account ID.
 * @param {Example} node
 * The node that we will be setting as HEAD.
 * @returns true if successful set, false if not
 */
async function setHead({uuid, node}) {
    const arrayFilters = [{'x.dataId': node.dataId}];
    const result = await Example.updateOne(
        {_id: uuid}, 
        { 
            '$set': { 
                [`${fieldName}.headNodeDataId`]: node.dataId, 
                [`${fieldName}.headNodeType`]: node.type,
                [`${fieldName}.${node.type}.$[x].prevNodeType`]: '',
                [`${fieldName}.${node.type}.$[x].prevNodeDataId`]: null
            }
        },
        {arrayFilters}
    );
    const promise = await Promise.resolve(result);
    return promise.modifiedCount > 0;
};

/**
 * Sets the tail node in the linked list.
 * @param {ObjectId} uuid
 * The linked list associated with the account ID.
 * @param {Example} node
 * The node that we will be setting as TAIL.
 * @returns true if successful set, false if not
 */
async function setTail({uuid, node}) {
    const arrayFilters = [{'x.dataId': node.dataId}];
    const result = await Example.updateOne(
        {
            '_id': uuid,
            [`${fieldName}.${node.type}.dataId`]: node.dataId
        }, 
        { 
            '$set': { 
                [`${fieldName}.tailNodeDataId`]: node.dataId, 
                [`${fieldName}.tailNodeType`]: node.type,
                [`${fieldName}.${node.type}.$[x].nextNodeType`]: '',
                [`${fieldName}.${node.type}.$[x].nextNodeDataId`]: null
            }
        }, {arrayFilters});
    const promise = await Promise.resolve(result);

    return promise.modifiedCount > 0;
};

/**
 * Inserts a node into the linked list.
 * @param {ObjectId} uuid
 * The linked list associated with the account ID.
 * @param {Example} node
 * The node that we will be adding to the list from the end/tail.
 * @returns true if successful set, false if not
 */
async function insert({uuid, node}) {
    const head = await this.head(uuid);
    const tail = await this.tail(uuid);

    // Update pipeline -- inserts data in a doubly linked list manner
    let updatePipeline = { 
        '$push': { 
            [`${fieldName}.${node.type}`] : {
                ...node,
                nextNodeType: '',
                nextNodeDataId: null,
                prevNodeType: head.dataId === null ? '' : tail.type,
                prevNodeDataId: head.dataId === null ? null : tail.dataId
            }
        },
        '$inc': {
            [`${fieldName}.listLength`]: 1
        }
    };

    const promise = await Example.updateOne({_id: uuid}, updatePipeline);
    await Promise.resolve(promise);

    // HEAD points to null
    if (head.dataId === null) {
        const newHead = await setHead({uuid, node});
        const newTail = await setTail({uuid, node});
        return newHead && newTail;
    }

    let arrayFilters2 = [{'x.dataId': tail.dataId}]

    // Update OLD tail to point to new node
    let filterPipeline2 = {
        '_id': uuid,
        [`${fieldName}.${tail.type}.dataId`]: tail.dataId
    };

    let updatePipeline2 = {
        '$set': {
            [`${fieldName}.${tail.type}.$[x].nextNodeType`]: node.type,
            [`${fieldName}.${tail.type}.$[x].nextNodeDataId`]: node.dataId
        }
    };

    const updateOldTail = await Example.updateOne(filterPipeline2, updatePipeline2, {arrayFilters: arrayFilters2});
    await Promise.resolve(updateOldTail);
   
    const newTail = await setTail({uuid, node});
    return newTail;
};

/**
 * Removes a node from the linked list.
 * @param {ObjectId} uuid
 * The linked list associated with the account ID.
 * @param {Example} node
 * The node that we will be removing.
 * @returns true if successful removal, false if not
 */
module.exports.remove = async function({uuid, node}) {

    const curr = await findNode({uuid, node});
    if (curr === null) return false;

    // Find previous node
    let arrayFilters1 = [{'x.dataId': curr.prevNodeDataId}];

    let filterPipeline1 = {
        '_id': uuid,
        [`${fieldName}.${curr.prevNodeType}.dataId`]: curr.prevNodeDataId,
    };

    // prev.next = curr.next
    let updatePipeline1 = {
        '$set': {
            [`${fieldName}.${curr.prevNodeType}.$[x].nextNodeType`]: curr.nextNodeType,
            [`${fieldName}.${curr.prevNodeType}.$[x].nextNodeDataId`]: curr.nextNodeDataId,
        },
    };

    const promise1 = await Example.updateOne(filterPipeline1, updatePipeline1, {arrayFilters: arrayFilters1});

    // Find+update next node (curr.next)
    // next.prev = curr.prev
    let arrayFilters2 = [{'y.dataId': curr.nextNodeDataId}];

    let filterPipeline2 = {
        '_id': uuid,
        [`${fieldName}.${curr.nextNodeType}.dataId`]: curr.nextNodeDataId
    };

    let updatePipeline2 = {
        '$set': {
            [`${fieldName}.${curr.nextNodeType}.$[y].prevNodeType`]: curr.prevNodeType,
            [`${fieldName}.${curr.nextNodeType}.$[y].prevNodeDataId`]: curr.prevNodeDataId,
        },
        '$inc': {
            [`${fieldName}.listLength`]: -1
        }
    };

    const promise2 = await Example.updateOne(filterPipeline2, updatePipeline2, {arrayFilters: arrayFilters2});

    // Delete document
    let updatePipeline = {
        '$pull': {
            [`${fieldName}.${curr.type}`]: { dataId: curr.dataId }
        } 
    };
    const updateNodes = await Example.updateOne({_id: uuid}, updatePipeline);
    const promise3 = await Promise.resolve(updateNodes);

    // Handle cases if the node being deleted was HEAD or TAIL
    const head = await this.head(uuid);
    const tail = await this.tail(uuid);

    if (head.dataId.equals(curr.dataId)) {
        // Point head to node's next
        const nodeNext = { dataId: curr.nextNodeDataId, type: curr.nextNodeType };
        await setHead({uuid, node: nodeNext});
    }

    if (tail.dataId.equals(curr.dataId)) {
        // Point tail to node's prev
        const nodePrev = { dataId: curr.prevNodeDataId, type: curr.prevNodeType };
        await setTail({uuid, node: nodePrev});
    }

    const results = await Promise.all([promise1, promise2, promise3]);
    return results[2].modifiedCount > 0;
};

/**
 * Pushes an EXISTING node to the tail.
 * @param {ObjectId} uuid
 * The linked list associated with the account ID.
 * @param {Example} node
 * The node that we will be setting at the end.
 * @returns if successful set, false if not
 */
module.exports.add = async function({uuid, node}) {
    // remove node
    const removeNode = await this.remove({uuid, node});
    const removePromise = await Promise.resolve(removeNode);
    if (removePromise) {
        const reinsertNode = await insert({uuid, node});
        const promise = await Promise.resolve(reinsertNode);
        return promise;
    }
    return false;
};

/**
 * Pops the head.
 * @param {ObjectId} uuid
 * The linked list associated with the account ID.
 * @returns if successful removal, false if not
 */
module.exports.pop = async function({uuid}) {
    const head = await this.head(uuid);
    const promise = await this.remove({uuid, node: head});
    return promise;
};