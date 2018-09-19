var express = require('express');
var bodyParser = require('body-parser');
var couchbase = require('couchbase');
var multer = require("multer");
var N1qlQuery = require("couchbase").N1qlQuery;
var fs = require('fs');
var path = require('path');

var app = express();

//app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var cluster = new couchbase.Cluster("127.0.0.1");
cluster.authenticate('prathmesh786', 'Qwerty123');
var bucket = cluster.openBucket("example", function(err){
	if(err){
		console.log(err);
	}
	console.log("Connected to the server...");
});

//setting up the storage engine
var storage = multer.diskStorage({
	destination: './public/upload/',
	filename: function(req, file, cb){
		cb( null, file.originalname+ '-' + Date.now()+".pdf");
	}
});

function checkFileType(file, cb){
	var filetypes = /pdf/;
	var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
	var mimetype = filetypes.test(file.mimetype);
	
	if(mimetype && extname){
		return cb(null, true);
	}
	return cb('Error: Not a pdf file');
}

var upload = multer({
	storage: storage,
	limits: {fileSize: 1000000 },
	fileFilter: function(req, file, cb){
		checkFileType(file, cb);
	}
}).single('pdfFile');

var appPublic = './public';
app.use(express.static(appPublic));

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get('/index', function(req, res) {
    res.render('index');
});

app.post('/success', urlencodedParser, function(req, res){
	upload(req, res, function(err){
		if(err){
			res.render('index', { message: err });
		}
		else{
			if(req.body.product_number == undefined || req.body.lot_number == undefined || 
					req.file == undefined){
				res.render('index', { message: 'Error: All fields are mandatory' });
			}
			else{
				var reqFilePath = req.file.path;
				var dbFilePath = reqFilePath;
				var dbFinalPath = dbFilePath.replace("public", "");
				var data1 = {
						lot_number: req.body.lot_number,
						product_number: req.body.product_number,
						pdfFile: {
							file_name: req.file.originalname,
							file_path: dbFinalPath
						},
						timestamp: (new Date())
				};
				bucket.insert(data1.lot_number, data1, function(error, result){
					if(error){
						console.log(error);
						res.render('index', {
							message: 'Lot number already exists in database please enter another Lot Number.'
						});
					}
					else{
						res.render('index', {
							message: 'Data Inserted Successfully'
						});
					}
				});
			}
		}
	});
});

function searchProduct(req, res, key){
	var person1 = [], i;
	var query = N1qlQuery.fromString('SELECT * FROM example WHERE lot_number = '+key);
	bucket.query(query, function(err, rows) {
	  if(err){
		  console.log(err);
	  }
	  for(i = 0; i < rows.length; i++){
		  person1[i] = rows[i].example;		  
 	  }
	  console.log(person1);
	  res.render('search-result', { 
		  name: key,
		  person: person1
		  });
	});
}

app.get('/all-records', function(req, res){
	var person1 = [], i;
	var key = JSON.stringify(req.query.search_item);
	if(key != undefined){
		searchProduct(req, res, key);
	}
	
	else{
		var query = N1qlQuery.fromString('SELECT DISTINCT * FROM example');
		bucket.query(query, function(err, rows) {
		  if(err){
			  console.log(err);
		  }
		  for(i = 0; i < rows.length; i++){
			  person1[i] = rows[i].example;
		  }
		  res.render('all-records', { person: person1 });
		});
	}
});

/*app.get("/search-result", function(req, res){
var person1 = [], i = 0;
var key = JSON.stringify(req.query.search_item);
var query = N1qlQuery.fromString('SELECT * FROM example WHERE lot_number = '+key);
bucket.query(query, function(err, rows) {
  if(err){
	  console.log(err);
  }
  
  for(i = 0; i < rows.length; i++){
	  person1[i] = rows[i].example;		  
	  }
  
  res.render('search-result', { person: person1 });
});
});*/

/*app.get('/all-records', function(req, res){
	var person1 = [], i;
	var query = N1qlQuery.fromString('SELECT DISTINCT * FROM example');
	bucket.query(query, function(err, rows) {
	  if(err){
		  console.log(err);
	  }
	  for(i = 0; i < rows.length; i++){
		  person1[i] = rows[i].example;
	  }
	  res.render('all-records', { person: person1 });
	});
});*/

app.listen(3000, '127.0.0.1');


console.log('Server running at http://127.0.0.1:3000/ Hello');
