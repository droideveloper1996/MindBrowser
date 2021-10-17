const express = require("express");
var url = require("url");
const checksum_lib = require("./checksum.js");
const https = require("https");
var request = require("request");
var bodyParser = require("body-parser");
const PORT = process.env.PORT || 3300;

app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "auth-token");
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT,POST,PATCH,DELETE,GET");
    return res.status(200).json({});
  }
  next();
});

// var PaytmConfig = {
//   mid: "MERCHANT_ID_HERE",
//   key: "MERCHANT_KEY_HERE",
//   website: "DEFAULT",
// };
var PaytmConfig = {
  mid: "veoqbc86051763263258",
  key: "snC4rbr!&3O2Si2L",
  website: "DEFAULT",
};

app.get("/", (req, res) => {
  res.status(400).json({ message: "Unauthorized Access", status: 400 });
});
app.post("/checksum", (req, res) => {
  console.log(req.body);

  var params = {};
  params["MID"] = PaytmConfig.mid;
  params["WEBSITE"] = PaytmConfig.website;
  params["CHANNEL_ID"] = "WEB";
  params["INDUSTRY_TYPE_ID"] = "Retail";
  params["ORDER_ID"] = req.body.ORDER_ID;
  params["CUST_ID"] = req.body.CUST_ID;
  params["TXN_AMOUNT"] = req.body.TXN_AMOUNT;
  params["CALLBACK_URL"] = req.body.CALLBACK_URL;
  params["EMAIL"] = req.body.EMAIL;
  params["MOBILE_NO"] = req.body.MOBILE_NO;

  checksum_lib.genchecksum(params, PaytmConfig.key, function (err, checksum) {
    if (err) return res.status(400).json(err);
    else return res.status(200).json({ checksum: checksum });
  });
});

app.post("/test", (req, res) => {
  console.log(req.body);
  return res.json(req.body);
});

app.post("/callback", (req, res) => {
  const par = JSON.stringify(req.body);
  const obj = JSON.parse(par);
  console.log("Parsed Object", obj);
  var checksumhash = obj.CHECKSUMHASH;
  var result = checksum_lib.verifychecksum(obj, PaytmConfig.key, checksumhash);
  console.log("Checksum Status", result);

  var verification_params = { MID: PaytmConfig.mid, ORDERID: obj.ORDERID };
  console.log("Verification Params", verification_params);
  checksum_lib.genchecksum(
    verification_params,
    PaytmConfig.key,
    function (err, checksum) {
      if (err) {
        return res.status(400).json(err);
      } else {
        verification_params.CHECKSUMHASH = checksum;
        post_data = "JsonData=" + JSON.stringify(verification_params);
        request.post(
          "https://securegw.paytm.in:443/merchant-status/getTxnStatus",
          { json: verification_params },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
              console.log(body);
              return res.redirect(
                `http://localhost:3000/payment?status=${body.STATUS}&TXNAMOUNT=${body.TXNAMOUNT}&TXNID=${body.TXNID}&RESPMSG=${body.RESPMSG}&RESPCODE=${body.RESPCODE}`
              );
            }
          }
        );
      }
    }
  );
});

app.listen(PORT, () => {
  console.log("Server Started");
});
