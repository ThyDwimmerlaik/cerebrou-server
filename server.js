var http = require('http');
var mysql = require('mysql');
var qs = require('querystring')
var fs = require('fs');
var conn = require('../db/connection.json');

var datosLectura;
var query='';

var pool = mysql.createPool({
  connectionLimit :   100,
  host :              conn.host,
  user :              conn.user,
  password :          conn.pass,
  database :          conn.database,
  debug :             false
});

function currentDate(){
  var d = new Date();
  d.setHours(d.getDate()-8);
  return d;
}

function writeLog(message){
  console.log(message);
  fs.writeFile('info.log',message,function(err){
    if(err) return console.log('['+currentDate()+'] ERROR: cant write on log file');
  });
}

function handleDB(req,res){
  pool.getConnection(function(err,connection){
    if(err){
      connection.release();
      writeLog('['+currentDate()+'] '+err.message);
      res.writeHead(100,'Error in connection database',{'Content-Type':'text/html'});
      res.end();
      return;
    }
    writeLog('['+currentDate()+'] '+'Connected to DB as id: ',connection.threadId);
    connection.query(query,function(err,result){
      if(!err) writeLog('['+currentDate()+'] '+'Data query successfully!');
      else writeLog('['+currentDate()+'] '+err.message);
    });
    connection.on('error', function(err) {      
      writeLog('['+currentDate()+'] '+err.message);
      res.writeHead(100,'Error in connection database',{'Content-Type':'text/html'});
      res.end();
      return;
    });
  });
}

http.createServer(function(req,res){
  switch(req.url){
    case '/':
      writeLog('['+currentDate()+'] '+'[INFO] Hand-seted parameters.');
      res.writeHead(200,'OK',{'Content-Type':'text/html'});
      res.write('<html><head><title>Hello cerebroU!</title><head><body>');
      res.write('<form action="/getdata" method="post">');
      res.write('Switch: <input type="text" name="switch" value=""/><br/>');
      res.write('Power: <input type="text" name="power" value=""/><br/>');
      res.write('Max Current: <input type="text" name="max" value=""/><br/>');
      res.write('Min Current: <input type="text" name="min" value=""/><br/>');
      res.write('<input type="submit"/>');
      res.write('</form></body></html>');
      res.end();
    break;
    case '/getdata':
      if(req.method=='POST'){
        req.on('data',function(chunk){
          datosLectura = qs.parse(String(chunk));
          writeLog('['+currentDate()+'] '+'Recieved data: ',datosLectura);
        });
        req.on('end',function(){
          res.writeHead(200,'OK',{'Content-Type':'text/html'});
          res.end();
          query = 'INSERT INTO cu_lecturas (id_dispo,valor,max,min,fecha) VALUES ('+datosLectura.switch+','+datosLectura.power+','+datosLectura.max+','+datosLectura.min+', NOW());';
          //writeLog(query);
          handleDB(req,res);
        });
      }else{
        writeLog('['+currentDate()+'] '+'Parameters not found.');
        res.writeHead('405','Method not supported',{'Content-Type':'text/html'});
        res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
      }
    break;

    default:
      writeLog('['+currentDate()+'] '+'[404] '+req.method+' to '+req.url);
      res.writeHead('404','N',{'Content-Type':'text/html'});
      res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
  }
}).listen(8080,function(err){
  if(!err)
    writeLog('['+currentDate()+'] '+'[INFO] Listening on 8080');
  else
    writeLog('['+currentDate()+'] '+'[INFO] ',err.message);
  });