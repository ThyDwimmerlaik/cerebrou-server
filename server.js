var http = require('http');
var mysql = require('mysql');
var qs = require('querystring');
var fs = require('fs');
var conn = require('../db/connection.json');

var readPostData;
var query='';

var orders_queue = [];
var readDevices = [];
var writeDevices = [];

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
  console.log('['+currentDate()+'] '+message);
  var stream = fs.createWriteStream('./debug/access.log',{flags:'a'});
  stream.once('open',function(fd){
    stream.write('['+currentDate()+'] '+message);
    stream.write('\n');
  });
}

function handleDB(q,callback){
  pool.getConnection(function(err,connection){
    if(err){
      connection.release();
      writeLog(err.message);
      return;
    }
    //writeLog('Connected to DB as id: '+connection.threadId);
    connection.query(q,function(err,rows,fields){
      connection.release();
      if(!err){
        if(rows.length > 0){
          var RowsFields = [];
          for (var i in rows){
            RowsFields[i] = rows[i];
          }
          //console.log('Data query and printed successfully!');
          callback(RowsFields);
        }
        else{
          //writeLog('Data query and inserted successfully!');
          return;
        }
      }
      else{
        writeLog(err.message);
        return;
      }
    });
    connection.on('error', function(err) {      
      connection.release();
      writeLog(err.message);
      return;
    });
  });
}

http.createServer(function(req,res){
  switch(req.url){
    
    case '/':
      res.writeHead(200,'OK',{'Content-Type':'text/html'});
      res.end();
    break;
    case '/hello':
      if(req.method=='POST'){
        var k = 0;
        var l = 0;
        orders_queue=[];
        writeLog('Recieved hail');
        query = 'SELECT id,type,A,J FROM cu_devices;';
        handleDB(query,function(query_res){
          for(var j=0;j<query_res.length;j++){
            enqueue(orders_queue,query_res[j].id+'D');
            if(query_res[j].type=="R" || query_res[j].type=="M"){
              readDevices[k] = {id:query_res[j].id,timeout:Number(query_res[j].J),last:new Date()};
              k+=1;
            }else if(query_res[j].type=="W" || query_res[j].type=="M"){
              if(query_res[j].J=="ALIVE"){
                writeDevices[l] = {id:query_res[j].id,A:String(query_res[j].A)};
                l+=1;
              }
            }
          }
        });
        res.writeHead(200,'OK',{'Content-Type':'text/html'});
        res.write('~HI');
        res.end();
      }
    break;
    case '/getqueue':
      if(req.method=='GET'){
        if(orders_queue.length > 0){
          var current_order = dequeue(orders_queue);
          res.writeHead(200,'OK',{'Content-Type':'text/html'});
          res.write('#'+current_order+'&');
          res.end();
        }else{
          res.writeHead(200,'OK',{'Content-Type':'text/html'});
          res.write('~EMPTY');
          res.end();
        }
      }
    break;
    case '/update':
      if(req.method=='POST'){
        req.on('data',function(chunk){
          readPostData = qs.parse(String(chunk));
          writeLog('Recieved data from cerebroU');
          console.log(readPostData);
        });
        req.on('end',function(){
          if(String(readPostData.id_dev[0])=="T"){
            handleDB('INSERT INTO cu_lecturas (id_dev,A,B,C,datetime) VALUES ("'+readPostData.id_dev+'",'+readPostData.A+','+readPostData.B+','+readPostData.C+', (NOW()-INTERVAL 5 HOUR));');
            res.writeHead(200,'OK',{'Content-Type':'text/html'});
            res.write('~COPY');
            res.end();
          }
          else if(String(readPostData.id_dev[0])=="S"){
            if(readPostData.B=="N"){
              handleDB('UPDATE cu_devices SET B="ON" WHERE id="'+readPostData.id_dev+'";');
              for(var h in writeDevices){
                if(writeDevices[h].id==readPostData.id_dev){
                  writeDevices[h].B = "ON";
                }
              }
            }else if(readPostData.A="M"){
              handleDB('UPDATE cu_devices SET B="OFF" WHERE id="'+readPostData.id_dev+'";');
              for(var h in writeDevices){
                if(writeDevices[h].id==readPostData.id_dev){
                  writeDevices[h].B = "OFF";
                }
              }
            }
            else if(readPostData.J="1"){
              handleDB('UPDATE cu_devices SET B="DEAD" WHERE id="'+readPostData.id_dev+'";');
            }
            res.writeHead(200,'OK',{'Content-Type':'text/html'});
            res.write('~COPY');
            res.end();
          }
          else{
            writeLog('Device not found.');
            res.writeHead(200,'OK',{'Content-Type':'text/html'});
            res.write('~LOST');
            res.end();
          }
        });
      }
    break;
    case '/test':
      console.log(orders_queue);
      console.log(readDevices);
      console.log(writeDevices);
      res.writeHead(200,'OK',{'Content-Type':'text/html'});
      res.end();
    break;
    default:
      writeLog('[404] '+req.method+' to '+req.url);
      res.writeHead('404','Not found',{'Content-Type':'text/html'});
      res.end('<html><head><title>ERROR</title></head><body><h1>NOT SUPPORTED</h1></body></html>');
  }
}).listen(8080,function(err){
  if(!err)
    writeLog('[INFO] Listening on 8080');
  else
    writeLog('[INFO] '+err.message);
  });


setInterval(function(){
  if(readDevices.length>0){
    var cd = new Date();
    for(var m in readDevices){
      var nd = Number(readDevices[m].last)+(readDevices[m].timeout*1000);
      if(Number(cd)>Number(nd) && !searchQueue(orders_queue,readDevices[m].id+'D')){
        enqueue(orders_queue,readDevices[m].id+'D');
        readDevices[m].last = new Date();
      }
    }
  }
}, 5000);

setInterval(function(){
  if(writeDevices.length>0){
    handleDB('SELECT id,B FROM cu_devices WHERE type = "W";',function(query_res){
      for(var n in query_res){
        for(var o in writeDevices){
          if(query_res[n].id==writeDevices[o].id){
            A_d = writeDevices[n].A;
            A_q = String(query_res[n].A);
            if(A_d=='OFF' && A_q=='ON'){
              unshift(orders_queue,writeDevices[o].id+'N');
              writeDevices[o].A = A_q;
            }
            else if(A_d=='ON' && A_q=='OFF'){
              unshift(orders_queue,writeDevices[o].id+'M');
              writeDevices[o].A = A_q;
            }
          }
        }
      }
    })
  }
},1000);


function enqueue(queue,element){
  writeLog('Pushed '+element+' to the queue.');
  queue.push(element);
}

function unshift(queue,element){
  writeLog('Unshifted '+element+' to the queue.');
  queue.unshift(element);
}

function dequeue(queue){
  if(queue.length>0){
    writeLog('Shifted '+queue[0]+' from the queue.');
    return queue.shift();
  }else{
    writeLog('Error: No elements on the queue.');
  }
}

function searchQueue(queue,element){
  for(var x in queue){
    if(element==queue[x]){
      return true;
    }
  }
  return false;
}