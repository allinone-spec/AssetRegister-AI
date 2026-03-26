// curl -X 'POST' \
//   'http://20.247.196.202:8086/api/MicrosoftSQL/saveSql' \
//   -H 'accept: */*' \
//   -H 'Content-Type: application/json' \
//   -d '{
//   "serverName": "SQL",
//   "dataBaseName": "otusone_team",
//   "tableName": "it_assets",
//   "username": "narendra",
//   "password": "bll@123",
//   "jobName": "manage_it_assets",
//   "integratedSecurity": ""
// }'


// SELECT *  FROM manage_it_assets.it_assets;




{folders && folders.map((item,index)=>(
    <FileExplorer key={index} exp={item} fetchFolders={fetchFolders} onEnterClick={onEnterClick} onInsertNode={handleInsertNode} />
))}