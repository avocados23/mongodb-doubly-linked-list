# MongoDB Doubly Linked List

Doubly linked list implementation in MongoDB (MQL) created for Availabowl - now deprecated since our data migration to Redis for storing "recent searches" for our userbase. 

You can read more about how I implemented this fully (and tweaked it to work for us) [here](https://availabowldevs.wordpress.com/2024/05/03/mongodb-doubly-linked-list-implementation-for-recent-searches/).

To understand the architecture of how my doubly linked-list implementation works,
documents at the top-most level of a collection ARE NOT nodes. Rather, the doubly linked-list is a field for a document, where your nodes are sub-documents. Refer to the example schema file (example.model.js) to see how this works.

## Requirements

- Node v20.x.x (at time of writing)

## Installation

1. Clone this repository: `git clone git@github.com:avocados23/mongodb-doubly-linked-list.git`
2. Change directories into the project root: `cd mongodb-doubly-linked-list`
3. Run `npm install` to install the required packages for the MongoDB doubly linked list methods.
4. Run `cp sample.env .env` and then modify your new `.env` file. The field name of your MongoDB document model that will contain your Doubly Linked List will be stored here. You are also free to modify the source code directly.
5. Utilizing ```/models/example.model.js```, create a field that will store your doubly linked list.


## API Reference

Remember that the doubly linked list is a FIELD. Therefore, to get the doubly linked list from a document, pass in the parent document's ID value (_id).

```
foo(PARENT_DOCUMENT_ID, ...)
```

#### head(uuid)
```
const head = await linkedlist.head('123456');
```

#### tail(uuid)
```
const tail = await linkedlist.tail('123456');
```

#### add({uuid, node})
```
const node = { 
    dataId: '123456'
};

await add({uuid: '7890', node});
```

#### remove({uuid, node})
```
const nodeDataToRemove = { 
    dataId: '123456',
    type: 'nodes'
};

await remove({uuid: '7890', node: nodeDataToRemove});
```

#### pop({uuid})
```
await pop({uuid: '123456'});
```
