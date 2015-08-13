var http = require('http');
var mysql = require('mysql');
var qs = require('querystring')
var fs = require('fs');
var conn = require('../db/connection.json');

var datosLectura;
var query='';
var dataResult;

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
  d.setHours(d.getHours()-5);
  return d;
}

function writeLog(message){
  console.log(message);
  var stream = fs.createWriteStream('./debug/access.log',{flags:'a'});
  stream.once('open',function(fd){
    stream.write(message);
    stream.write('\n');
  });
}

function handleDB(req,res,q){
  pool.getConnection(function(err,connection){
    if(err){
      connection.release();
      writeLog('['+currentDate()+'] '+err.message);
      res.writeHead(100,'Error in connection database',{'Content-Type':'text/html'});
      res.end();
      return;
    }
    writeLog('['+currentDate()+'] '+'Connected to DB as id: '+connection.threadId);
    connection.query(q,function(err,rows){
      connection.release();
      if(!err){
        var stringRows = [];
        for (var i=0;i<rows.length;i++){
          stringRows[i] = String(rows[i].id);
        }
        writeLog('['+currentDate()+'] '+'Data query successfully!');
        return stringRows;
      }
      else{
        writeLog('['+currentDate()+'] '+err.message);
        return;
      }
    });
    connection.on('error', function(err) {      
      connection.release();
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
          writeLog('['+currentDate()+'] '+'Recieved data');
        });
        req.on('end',function(){
          //writeLog(query);
          handleDB(req,res,'INSERT INTO cu_lecturas (id_dispo,valor,max,min,fecha) VALUES ('+datosLectura.switch+','+datosLectura.power+','+datosLectura.max+','+datosLectura.min+', (NOW()-INTERVAL 5 HOUR));');
        });
      }else{
        writeLog('['+currentDate()+'] '+'Parameters not found.');
        res.writeHead('405','Method not supported',{'Content-Type':'text/html'});
        res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
      }
    break;
    case '/getdisp':
      var r;
      handleDB(req,res,'SELECT id FROM cu_dispos;',function(resDB){
        res.writeHead(200,'OK',{'Content-Type':'text/html'});
        res.write('#'+String(resDB)+'&');
        res.end();
      });
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
    writeLog('['+currentDate()+'] '+'[INFO] '+err.message);
  });