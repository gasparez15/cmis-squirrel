import { ActivityIndicator, CollectionView, Cell, CollectionViewProperties, Composite, CompositeProperties, ImageView, Page, PageProperties, NavigationView, TextView, device, ui } from 'tabris';
import CmisSession from './cmisSession'
import { cmis } from './lib/cmis';
const roundTo = require('round-to');
declare var cordova: any;

export default class FolderPage extends Page {

    private folderId: string;

    private collectionView: CollectionView;

    private navigationView: NavigationView;
    
    private activityIndicator: ActivityIndicator;

    constructor(folderId: string, navigationView: NavigationView, properties?: PageProperties) {
        super(properties);
        this.folderId = folderId;
        this.navigationView = navigationView;
        this.appendTo(navigationView);
        let session = CmisSession.getSession();

        this.activityIndicator = new ActivityIndicator({
            centerX: 0,
            centerY: 0,
            visible: true,
        }).appendTo(this);

        session.getChildren(folderId).then(data => {
            let cmisObjects: any[] = data.objects;
            let tmpData: any[] = new Array(data.objects.length);
            for (var i = 0; i < cmisObjects.length; i++) {
                // console.log(i + " ----------------------------------");
                let tmp:any = {};
                tmp.cmisObjectId = cmisObjects[i].object.properties['cmis:objectId'].value;
                tmp.cmisName = cmisObjects[i].object.properties['cmis:name'].value;
                tmp.cmisBaseTypeId = cmisObjects[i].object.properties['cmis:baseTypeId'].value;
                if (cmisObjects[i].object.properties['cmis:contentStreamLength']) {
                    tmp.cmisContentStreamFileSize = cmisObjects[i].object.properties['cmis:contentStreamLength'].value;
                }
                tmpData[i] = tmp;
                // console.log("cmisObjectId: " + tmpData[i].cmisObjectId);
                // console.log("cmisName: " + tmpData[i].cmisName);
                // console.log("cmisBaseTypeId: " + tmpData[i].cmisBaseTypeId);
                // console.log("contentStreamLength: " + tmpData[i].cmisContentStreamFileSize);
            }
            this.collectionView = this.createContentCollectionView(tmpData);
            this.collectionView.appendTo(this);

            this.activityIndicator.visible = false;
        });
    }

    private createContentCollectionView(data: any[]) {
        return new CollectionView({
            left: 0, top: 0, right: 0, bottom: 0,
            id: 'contentCollectionView',
            items: data,
            initializeCell: this.initializeCell,
            itemHeight: device.platform === 'iOS' ? 60 : 68
        }).on('select', ({ item }) => {
            console.log("In Select EventHandler ...");
            console.log("Item selected: " + JSON.stringify(item));
            console.log("cmisObjectId: " + JSON.stringify(item.cmisObjectId));
            console.log("Creating sub content page ...");
            if (item.cmisBaseTypeId == 'cmis:folder') {
                let folderPage = new FolderPage(item.cmisObjectId, this.navigationView,
                    {
                        title: item.cmisName
                    });
            } else if (item.cmisBaseTypeId == 'cmis:document') {
                // TODO: Check if document has content stream
                this.openContent(item.cmisObjectId, item.cmisName);
            }
            console.log("Created sub content page ...");
        });
    }

    private initializeCell(cell:Cell) {
        new Composite({
            left: 10, right: 10, bottom: 0, height: 1,
            background: '#bbb'
        }).appendTo(cell);
        var icon = new ImageView({
            left: 10, top: 10, bottom: 10,
            scaleMode: 'fit'
        }).appendTo(cell);
        var objectName = new TextView({
            left: 60, right: 60, top: 8,
            markupEnabled: true,
            id: 'objectName',
            textColor: '#4a4a4a'
        }).appendTo(cell);
        var objectSize = new TextView({
            left: 60, top: ["#objectName", 6],
            markupEnabled: true,
            textColor: '#9a9a9a'
        }).appendTo(cell);
        cell.on('change:item', function ({ value: item }) {
            if (item.cmisBaseTypeId == 'cmis:document') {
                icon.set('image', 'icons/document.png');
            } else {
                icon.set('image', 'icons/folder.png');
            }
            objectName.set('text', item.cmisName);
            if (item.cmisContentStreamFileSize) {
                let size:number = item.cmisContentStreamFileSize
                if (size < 1024) {
                    objectSize.set('text', size + ' Byte');
                } else if (size <  1048576) {
                    objectSize.set('text', roundTo((size / 1024), 1) + ' KB');
                } else if (size <  1073741824) {
                    objectSize.set('text', roundTo((size / 1048576), 1) + ' MB');
                }
            }
        });
        cell.on('select', function ({ value: item }) {
            console.log("CELL SELECTED !!!!!!")
            icon.set('image', 'icons/Cloud-50.png');
            objectName.set('text', item.cmisBaseTypeId);
        });
    }

    private openContent(fileId: string, fileName: string): void {
        // Need to reassign cause we can not use 'this' keyword in callbacks to fileTransfer
        // TODO: Check if doing sth. like this is ok
        let activityIndicator = this.activityIndicator;
        let contentColView = this.collectionView;

        activityIndicator.visible = true;
        contentColView.enabled = false;

        let url = 'https://cmis.alfresco.com/alfresco/api/-default-/public/cmis/versions/1.1/browser/root?objectId=' + fileId + '&cmisselector=content';
        let fileTransfer = new FileTransfer();
        // let target = 'cdvfile://localhost/temporary/cmis/cmisTempDownload.' + fileName.substring(fileName.length - 3, fileName.length);
        let target = 'cdvfile://localhost/temporary/cmis/' + encodeURIComponent(fileName);
        console.log('TARGET: ' + target);
        fileTransfer.download(
            url,
            target,
            function (entry) {
                console.log("download complete: " + decodeURIComponent(entry.toURL()));
                activityIndicator.visible = false;
                contentColView.enabled = true;
                cordova.plugins.fileOpener2.open(decodeURIComponent(entry.toURL()), decodeURIComponent(fileName), (data) => {
                    console.log("CALLBACK CALLLED !!!!!");
                    console.log("data fileOpener CB: " + JSON.stringify(data));
                });
            },
            function (error) {
                activityIndicator.visible = false;
                contentColView.enabled = true;
                console.log("download error complete: " + JSON.stringify(error));
                console.log("download error source: " + JSON.stringify(error.source));
                console.log("download error target: " + JSON.stringify(error.target));
                console.log("download error code: " + JSON.stringify(error.code));
            },
            false,
            {
                headers: {
                    "Authorization": "Basic YWRtaW46YWRtaW4="
                }
            }
        );
    }

}