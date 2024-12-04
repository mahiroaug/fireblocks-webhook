const { WebClient, LogLevel } = require("@slack/web-api");
//const { pro } = require("ccxt");
const crypto = require("crypto");

const publicKey = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA0+6wd9OJQpK60ZI7qnZG
jjQ0wNFUHfRv85Tdyek8+ahlg1Ph8uhwl4N6DZw5LwLXhNjzAbQ8LGPxt36RUZl5
YlxTru0jZNKx5lslR+H4i936A4pKBjgiMmSkVwXD9HcfKHTp70GQ812+J0Fvti/v
4nrrUpc011Wo4F6omt1QcYsi4GTI5OsEbeKQ24BtUd6Z1Nm/EP7PfPxeb4CP8KOH
clM8K7OwBUfWrip8Ptljjz9BNOZUF94iyjJ/BIzGJjyCntho64ehpUYP8UJykLVd
CGcu7sVYWnknf1ZGLuqqZQt4qt7cUUhFGielssZP9N9x7wzaAIFcT3yQ+ELDu1SZ
dE4lZsf2uMyfj58V8GDOLLE233+LRsRbJ083x+e2mW5BdAGtGgQBusFfnmv5Bxqd
HgS55hsna5725/44tvxll261TgQvjGrTxwe7e5Ia3d2Syc+e89mXQaI/+cZnylNP
SwCCvx8mOM847T0XkVRX3ZrwXtHIA25uKsPJzUtksDnAowB91j7RJkjXxJcz3Vh1
4k182UFOTPRW9jzdWNSyWQGl/vpe9oQ4c2Ly15+/toBo4YXJeDdDnZ5c/O+KKadc
IMPBpnPrH/0O97uMPuED+nI6ISGOTMLZo35xJ96gPBwyG5s2QxIkKPXIrhgcgUnk
tSM7QYNhlftT4/yVvYnk0YcCAwEAAQ==
-----END PUBLIC KEY-----`.replace(/\\n/g, "\n");

// -------------------------------------------------------------
// CONSTANTS
// -------------------------------------------------------------
const blockchainExplorerUrls = {
  ETH: "https://etherscan.io/",
  ETH_TEST3: "https://goerli.etherscan.io/",
  ETH_TEST6: "https://holesky.etherscan.io/",
  MATIC: "https://polygonscan.com/",
  MATIC_POLYGON: "https://polygonscan.com/",
  MATIC_POLYGON_MUMBAI: "https://mumbai.polygonscan.com/",
  AMOY_POLYGON_TEST: "https://amoy.polygonscan.com/",
};

const slackClient = new WebClient(process.env.SLACK_OAUTH_TOKEN, {
  // LogLevel can be imported and used to make debugging simpler
  logLevel: LogLevel.DEBUG,
});
const channel = process.env.SLACK_POST_CHANNEL;
const author_name = process.env.AUTHOR_NAME;

exports.handler = async (event, context) => {
  // -------------------------------------------------------------
  // initializer
  // -------------------------------------------------------------
  const currentUnixTime = Math.floor(Date.now() / 1000);

  // ##### verify signature
  console.log("event-headers:", event.headers);
  console.log("event-body:", event.body); // event.body(ojbect)

  const message = JSON.stringify(event.body); // message(JSON)
  const signature = event.headers["Fireblocks-Signature"];
  const verifier = crypto.createVerify("RSA-SHA512");
  verifier.write(message);
  verifier.end();
  const isVerified = verifier.verify(publicKey, signature, "base64");
  console.log("Verified:", isVerified);

  // -------------------------------------------------------------
  // json parse
  // -------------------------------------------------------------
  const inputJSON = JSON.parse(event.body); //inputJSON(object)
  console.log("inputJSON:", inputJSON);

  // param check
  let sourceAddr = "null";
  let destinationAddr = "null";
  let txHash = "null";
  let txURL = "null";

  if (inputJSON.data.sourceAddress) {
    sourceAddr = inputJSON.data.sourceAddress;
  }
  if (inputJSON.data.destinationAddress) {
    destinationAddr = inputJSON.data.destinationAddress;
  }
  if (inputJSON.data.txHash) {
    txHash = inputJSON.data.txHash;
    txURL = blockchainExplorerUrls[inputJSON.data.assetId] + "tx/" + txHash;
  }
  if (Array.isArray(inputJSON.data.networkRecords)) {
    inputJSON.data.networkRecords.forEach((record, index) => {
      if (record.txHash) {
        if (txHash.length < record.txHash.length) {
          txHash = record.txHash;
          txURL =
            blockchainExplorerUrls[inputJSON.data.assetId] + "tx/" + txHash;
        }
      }
    });
  }

  // -------------------------------------------------------------
  // create attachments
  // -------------------------------------------------------------
  const attachments = [
    {
      //pretext: "fireblocks notification",
      fallback: "fireblocks notice: " + inputJSON.data.status,
      color: "#B1063A",
      author_name: author_name,
      title: inputJSON.type,
      text: "TX_ID : `" + inputJSON.data.id + "`",
      fields: [
        {
          title: "opration/amount",
          value:
            inputJSON.data.operation +
            "\n" +
            inputJSON.data.amount +
            " " +
            inputJSON.data.assetId,
          short: "true",
        },
        {
          title: "status",
          value: inputJSON.data.status,
          short: "true",
        },
        {
          title: "source",
          value:
            inputJSON.data.source.type +
            "\n" +
            inputJSON.data.source.name +
            "{" +
            inputJSON.data.source.id +
            "}",
          short: "true",
        },
        {
          title: "destination",
          value:
            inputJSON.data.destination.type +
            "\n" +
            inputJSON.data.destination.name +
            "{" +
            inputJSON.data.destination.id +
            "}",
          short: "true",
        },
        {
          title: "sourceAddr",
          value: sourceAddr,
          short: "true",
        },
        {
          title: "destinationAddr",
          value: destinationAddr,
          short: "true",
        },
        {
          title: "txHash",
          value: txHash,
          short: "true",
        },
        {
          title: "explorer",
          value: txURL,
          short: "true",
        },
      ],
      footer: inputJSON.data.note + " (" + inputJSON.data.createdBy + ") ",
      ts: currentUnixTime,
    },
  ];

  // # passing QUEUED #
  /*
    if (inputJSON.data.status === "QUEUED"){
        console.log("Status is QUEUED, so skipped posting slack");
        return {
            statusCode: 200,
            body: "ok"
        };
    }
    */

  // # get thread ID #
  const thread = await search_timestamp_for_txID(inputJSON.data.id);
  console.log(`thread is ${thread}`);

  // # post slack #
  if (thread) {
    await postSlack(attachments, thread);
  } else {
    await postSlack(attachments);
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};

// -------------------------------------------------------------
// get conversation history
// -------------------------------------------------------------
async function getConversationHistory() {
  try {
    const result = await slackClient.conversations.history({
      channel: channel,
      limit: 50,
    });
    console.log(result.messages);
    return result.messages;
  } catch (error) {
    console.error("get conversation error: ", error);
    console.dir(error, { depth: null });
  }
}

// -------------------------------------------------------------
// search tx_id from conversation history
// -------------------------------------------------------------
async function search_timestamp_for_txID(target_txid) {
  console.log(`target_txid is ${target_txid}`);
  const conversations = await getConversationHistory();
  console.log(conversations);

  let thread_ts = null;
  conversations.forEach((item, index) => {
    if (item.attachments) {
      console.log(`Index ${index}: found attachments`);

      item.attachments.forEach((attachment) => {
        //console.log(`Attachment inner`);

        const regex = /TX_ID : `(.+?)`/;
        const matches = attachment.text.match(regex);

        if (matches && matches[1]) {
          console.log(`Found Transaction ID: ${matches[1]}`);

          if (matches[1] === target_txid) {
            console.log(`Match TS: ${item.ts}`);
            thread_ts = item.ts;
          }
        } else console.log(`Couldn't find Transaction ID`);
      });
    }
  });
  console.log(`return thread_ts is ${thread_ts}`);
  return thread_ts;
}

// -------------------------------------------------------------
// post slack
// -------------------------------------------------------------
async function postSlack(attachments, thread) {
  try {
    const response = await slackClient.chat.postMessage({
      channel: channel,
      //text: attachments,
      attachments: attachments,
      as_user: true,
      ...(thread != null && { thread_ts: thread }),
    });
    console.log("slackResponse: ", response);
    return response;
  } catch (error) {
    console.error("Error posting message: ", error);
  }
}
