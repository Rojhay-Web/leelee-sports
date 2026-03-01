import { useContext, useEffect, useRef, useState } from "react";
import { useBlocker } from 'react-router-dom';
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { toast } from 'react-toastify';
import * as _ from 'lodash';
import ReactQuill from 'react-quill-new';
import Slider from "react-slick";
import parse from 'html-react-parser';
import { v4 as uuidv4 } from 'uuid';
import SlidingPane from "react-sliding-pane";
import "react-sliding-pane/dist/react-sliding-pane.css";

// Custom Styles
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import 'react-quill-new/dist/quill.snow.css';

import SelectedPhotosCtrl from "../../components/blueprint/selectedPhotoCtrl";
import GalleryCtrlModal from "../../components/blueprint/galleryCtrlModal.v2";
import ConfirmToastContent from "../../components/blueprint/confirmToast";

import userContext from "../../../context/user.context";

import { FilePhoto, PageKey, Photo, SitePage, UserContextType } from "../../../datatypes";
import { API_URL, handleGQLError } from "../../../utils";
import { log } from "../../../utils/log";

type KeyEditorTileType = {
    pageKey: PageKey, updatePageData: (data: any) => void
}

type ImageEditorType = {
    maxSelect?: number, selected?: FilePhoto[], tag: string,
    updateList:(images:Photo[]) => void
}

type CustomItemEditorType = { 
    show: boolean, 
    selItem: any,
    selIdx: number,
    fields: any[],
    closeAction: () => void,
    saveItem: (idx: number, item: any, remove?: boolean) => void
}

const quillSetup = {
    modules: {
        toolbar:[
            [{ 'header': '1'}, {'header': '2'}, {size: []}],
            ['bold', 'italic', 'underline', 'strike'],
            [{'list': 'ordered'}, {'list': 'bullet'}, 
                {'indent': '-1'}, {'indent': '+1'}],
            ['link', 'clean'],
        ],
        clipboard: {matchVisual: false }
    },
    formats: [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike',
        'list', 'indent', 'link',
    ]
};

const GET_SITE_PAGES_QUERY = gql`
    query GetSitePages{
        sitePages{
            _id
            title
            key
        }
    }`,
GET_IND_SITE_PAGE_QUERY = gql`
    query GetSitePage($key: String!) { 
        sitePage(key: $key) {
            _id
            title
            key
            pageKeys {
                _id
                title
                type
                metaData
                value
            }
        }
    }`,
UPSERT_PAGE_MUTATION = gql`
    mutation UpsertSitePage($title: String!, $pageKeys:[PageKeyInput], $_id:String){
        upsertSitePage(title: $title, pageKeys: $pageKeys, _id: $_id)
    }`,
REMOVE_PHOTOS_FROM_SET = gql`
    mutation RemovePhotosFromSet($id:String!, $photoIds: [String]!){
        removePhotosetPhotos(id:$id, photoIds: $photoIds)
    }`,
GET_PHOTOSET_IMAGES_QUERY = gql`
    query getPhotosetImages($id:String!, $page: Int, $pageSize:Int){
       photosetImages(id: $id, page:$page, pageSize:$pageSize){
           pagesLeft
           results {
               _id
               title
               created
               updated
           }
       }
   }`,
SEARCH_PHOTOS_QUERY = gql`
    query searchPhotos($page: Int, $pageSize:Int){
       photos(page:$page, pageSize:$pageSize){
           pagesLeft
           results {
               _id
               title
               created
               updated
           }
       }
   }`;

const mini_settings = {
    infinite: false,
    slidesToShow: 2,
    slidesToScroll: 1,
    speed: 500,
    responsive: [
        {
            breakpoint: 1000,
            settings: {
                slidesToShow: 3
            }
        },
        {
            breakpoint: 770,
            settings: {
                slidesToShow: 2
            }
        }
    ]
};

const settings = {
    infinite: false,
    slidesToShow: 4,
    slidesToScroll: 1,
    speed: 500,
    responsive: [
        {
            breakpoint: 1000,
            settings: {
                slidesToShow: 3
            }
        },
        {
            breakpoint: 770,
            settings: {
                slidesToShow: 2
            }
        }
    ]
};

function PillListEditor({ list, updateList }:{ list:string[], updateList: (e:string[]) => void }){
    const [newItem, setNewItem] = useState("");

    const [dragItem, setDragItem] = useState<number | null>(null);
    const [draggedOverItem, setDraggedOverItem] = useState<number | null>(null);


    const addToList = () => {
        try {
            if(newItem.length > 0){
                let tmpList = (!list ? [] : _.cloneDeep(list));
                tmpList.push(newItem);
                updateList(tmpList);
                setNewItem("");
            }
        }
        catch(ex){
            log.error(`Adding To List: ${ex}`)
        }
    }

    const removeFromList = (idx: number) => {
        try {
            if(idx < list.length){
                let tmpList = (!list ? [] : _.cloneDeep(list));
                tmpList.splice(idx, 1);
                updateList(tmpList);
            }
        }
        catch(ex){
            log.error(`Removing From List: ${ex}`)
        }
    }

    const handleKeyDown = (e:any) =>{
        try {
            if (e.key === 'Enter') { addToList(); }
        }
        catch(ex){
            log.error(`Handling Key Down: ${ex}`);
        }
    }

    const handleDragStart = (idx: number) => {
       setDragItem(idx);
    }

    const handleDragEnter = (idx: number) => {
       setDraggedOverItem(idx);
    }

    const handleDrop = () => {
        try {
            if(dragItem != null && draggedOverItem != null) {
                const newItems = [...list];
                const draggedItemContent = newItems[dragItem];
                newItems.splice(dragItem, 1); // Remove from original position
                newItems.splice(draggedOverItem, 0, draggedItemContent); // Insert at new position
                
                updateList(newItems);
                setDragItem(null);
                setDraggedOverItem(null);
            }
        }
        catch(ex){
            log.error(`Handling Drag Drop: ${ex}`);
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
       e.preventDefault(); // Allow dropping
    }

    return(
        <div className="pill-list-editor-container">
            <div className="ple-input-container">
                <input className="ple-input" value={newItem} onChange={(e:any) => { setNewItem(e.target.value); }} onKeyDown={handleKeyDown}/>
                <div className={`ple-btn ${newItem.length <= 0 ? "disabled":""}`} onClick={addToList}>
                    <span className="material-symbols-outlined">add</span>
                    <span className="ple-title">Add Item</span>
                </div>
            </div>

            <div className="ple-list">
                {list && list?.length > 0 ?
                    <>
                        {list?.map((item,i)=>
                            <div className={`ple-item ${dragItem === i ? 'dragging' : ''} ${draggedOverItem === i ? 'dragged-over' : ''}`} key={i} draggable={true}
                                onDragStart={(e) => handleDragStart(i)}
                                onDragEnter={(e) => handleDragEnter(i)}
                                onDragEnd={handleDrop} onDragOver={handleDragOver}
                            >
                                <span className="material-symbols-outlined remove-ple" onClick={()=> removeFromList(i)}>close</span>
                                <span className="ple-title">{item}</span>
                            </div>
                        )}
                    </> : <></>
                }
            </div>
        </div>
    );
}

export function ImageEditor({ maxSelect=1, tag, updateList }: ImageEditorType){
    const [openModal, setOpenModal] = useState(false);
    const [localSelect, setLocalSelect] = useState<FilePhoto[]>([]);
    const [manualAdd, setManualAdd] = useState(false); 

    const { user } = useContext(userContext.UserContext) as UserContextType;

    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [searchImages,{ loading: search_loading, data: search_data }] = useLazyQuery(SEARCH_PHOTOS_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    const [retrievePhotosetImages,{ loading: photoset_images_loading, data: photoset_images_data }] = useLazyQuery(GET_PHOTOSET_IMAGES_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    
    // Mutations
    const [removePhotos,{ loading: remove_photos_loading, data: remove_photos_data }] = useMutation(REMOVE_PHOTOS_FROM_SET, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    
    const tabs = ["image selection","upload new images"];

    const toggleImage = (photo: FilePhoto) => {
        try {
            let toggleIdx = localSelect.map((u:any)=> u.url).indexOf(photo.url);
            if(toggleIdx >= 0){
                // REMOVE tag from image
                removePhotos({ variables: { id: tag, photoIds: [photo._id] }});
            }
        }
        catch(ex){
            log.error(`Toggling SE Image: ${ex}`);
        }
    }

    const closeModal = (photoset: FilePhoto[]) => {
        try {
            // TODO: Add photos to selected
            setOpenModal(false);
        }
        catch(ex){
            log.error(`Closing Modal: ${ex}`);
        }
    }

    const modalSecondAction = (tab: string, ids: string[], photoset: FilePhoto[]) => {
        try {
            if(tab === "upload new images") {
                searchImages({ variables: { page: 1, pageSize: ids?.length }});
                closeModal(photoset);                
            }
            else {
                retrievePhotosetImages({ variables: { id:tag, page: 1, pageSize: 20 }});
                setManualAdd(true);
            }
        }
        catch(ex){
            log.error(`Performing modal second action: ${ex}`);
        }
    }

    const checkOpenModal = () => {
        try {
            if((maxSelect - localSelect?.length) <= 0){
                toast.warning(`You have reached the limit for images for this field.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                setManualAdd(false);
                setOpenModal(true);
            }
        }
        catch(ex){
            log.error(`Checking Open Modal: ${ex}`);
        }
    }

    useEffect(()=>{
        if(!search_loading && search_data?.photos?.results?.length > 0){
            let tmpList = localSelect.concat(search_data.photos.results);
            updateList(tmpList as Photo[]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[search_loading]);

    // Get Data from DB
    useEffect(()=>{
        if(tag){
            retrievePhotosetImages({ variables: { id:tag, page: 1, pageSize: 20 }});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[tag]);

    useEffect(()=>{
        if(!remove_photos_loading && remove_photos_data?.removePhotosetPhotos) {
            retrievePhotosetImages({ variables: { id:tag, page: 1, pageSize: 20 }});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[remove_photos_data]);

    useEffect(()=>{
        if(!photoset_images_loading && photoset_images_data?.photosetImages){
            setLocalSelect(photoset_images_data.photosetImages.results);
        }
        else {
            setLocalSelect([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[photoset_images_data]);

    return(
        <div className="image-editor-container">
            <div className="image-editor-upload-btn-container">
                <button className='image-editor-upload-container' onClick={checkOpenModal} disabled={localSelect?.length >= maxSelect}>
                    <span className="material-symbols-outlined">gallery_thumbnail</span>
                    <span className='title'>Add/Select Image(s)</span>
                </button>

                <div className="image-editor-sel-total">
                    <span>{localSelect?.length ?? 0}</span>
                    <span>/</span>
                    <span>{maxSelect}</span>
                </div>
            </div>

            <SelectedPhotosCtrl maxSelect={maxSelect} selected={localSelect} uploadFlag={false} selecting={false} setCompleted={(d)=>{}} toggleImage={toggleImage} />
            
            <GalleryCtrlModal visible={openModal} tabs={tabs} tag={tag} maxSelect={(maxSelect - localSelect?.length)} secondActionTitle={"Add Image(s)"}
                secondAction={modalSecondAction} secondActionLoading={search_loading} hasSecondAction={true} 
                secondActionStatus={(search_data?.photos?.results?.length > 0 || manualAdd)} closeAction={closeModal} />
        </div>
    );
}

function CustomItemEditor({ show, selItem, selIdx, fields, closeAction, saveItem }: CustomItemEditorType){
    const [windowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [localItem, setLocalItem] = useState<any>({});

    const fieldRef = useRef<HTMLDivElement>(null);

    const calcModalSize = () => {
        let ret = { width: 400, height: 300 };
        try {
            ret.width = (windowSize.width > 832 ? 800 : .85 * windowSize.width);
            ret.height = (windowSize.height < 200 ? 200 : .85 * windowSize.height);
        }
        catch(ex){
            log.error(`Calculating Modal Size: ${ex}`);
        }
        return ret;
    }

    const defaultHandleChange = (e:any) => {
        try {
            setLocalItem((d:any) => {
                return { ...d, [e.target.name]: e.target.value };
            });
        }
        catch(ex){
            log.error(`Handle Default Change: ${ex}`);
        }
    }

    const quillHandleChange = (key: string, value:any) => {
        try {
            setLocalItem((d:any) => {
                return { ...d, [key]: value };
            });
        }
        catch(ex){
            log.error(`Handle Quill Change: ${ex}`);
        }
    }

    const getTileContentEditor = (field: any) => {
        try {
            switch(field?.type){
                case "title":
                    return <textarea name={`${field?.title}`} rows={3} value={localItem[field.title] ?? ""} onChange={defaultHandleChange} />;
                case "description":
                    return <ReactQuill theme="snow" value={localItem[field.title] ?? ""} onChange={(val) => quillHandleChange(field.title, val)} 
                                modules={quillSetup.modules} formats={quillSetup.formats} className="admin-quill"
                            />;
                case "list":
                    return <PillListEditor list={localItem[field.title] ?? []} updateList={(val) => quillHandleChange(field.title, val)} />;
                case "images":
                    return <ImageEditor selected={localItem[field.title]} maxSelect={6} tag={localItem?._id} updateList={(val) => quillHandleChange(field.title, val)}/>;
                case "number":
                    return <input name={`${field?.title}`} value={localItem[field.title] ?? null} type="number" onChange={defaultHandleChange} />;
                default:
                    return <></>;
            }
        }
        catch(ex){
            log.error(`Getting tile content editor: ${ex}`);
        }
    }

    const saveLocalItem = () => {
        saveItem(selIdx, localItem);
        closeAction();
    }

    useEffect(()=>{
        if(selItem){
            setLocalItem(_.cloneDeep(selItem));
        }
    },[selItem]);

    useEffect(()=>{ fieldRef.current?.scrollTo(0,0); },[show]);
    
    return(
        <SlidingPane
            className="custom-item-pane"
            overlayClassName="custom-item-pane-overlay"
            isOpen={show}
            hideHeader={true}
            width={'70%'}
            onRequestClose={closeAction}
        >
            <div className="custom-item-editor-container">
                <h1>Edit Custom List Item</h1>
                <div className="cie-fields" ref={fieldRef}>
                    {fields.map((field,i) =>
                        <div className="cie-field-container" key={i}>
                            <div className="cie-field-title">{field.title}</div>
                            {getTileContentEditor(field)}
                        </div>
                    )}
                </div>
                <div className="cie-btn-container">
                    <div className="cie-btn pending" onClick={saveLocalItem}>
                        <span className="material-symbols-outlined">pending_actions</span>
                        <span>Stage Changes</span>
                    </div>

                    <div className="cie-btn cancel" onClick={closeAction}>
                        <span className="material-symbols-outlined">close</span>
                        <span>Cancel</span>
                    </div>
                </div>
            </div>
        </SlidingPane>
    );
}

function CustomItemPreview({ field, item }:{field: any, item: any}){
    const [retrievePhotosetImages,{ data }] = useLazyQuery(GET_PHOTOSET_IMAGES_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});

    const getListPreviewItem = (field: any, item: any) =>{
        try {
            switch(field?.type){
                case "title":
                    return <div className="txt-list title">{(item[field?.title] ? parse(item[field?.title]) : '')}</div>;
                case "description":
                case "number":
                    return <div className="txt-list">{(item[field?.title] ? parse(item[field?.title]) : '')}</div>;
                case "list":
                    return <div className="preview-div p-list">
                        {item[field?.title]?.map((li: any, i:number) =>
                            <div className="ple-item" key={i}>
                                <span className="ple-title">{li}</span>
                            </div>
                        )}
                    </div>;
                case "images":
                    let initPhoto = data?.photosetImages?.results?.length > 0 ? data?.photosetImages?.results[0]?._id : null;

                    return <div className="preview-div p-img">
                        {initPhoto ?
                            <img src={`${API_URL}/kaleidoscope/${initPhoto}`} alt={`custom list item preview`} /> :
                            <></>
                        }
                    </div>;
                default:
                    return <></>;
            }
        }
        catch(ex){
            log.error(`Getting List Item Preview Item: ${ex}`);
        }
    }

    useEffect(()=>{
        if(field?.type === "images" && item?._id){
            retrievePhotosetImages({ variables: { id:item?._id, page: 1, pageSize: 1 }});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[item, field]);

    return(
        <>{getListPreviewItem(field, item)}</>
    );
}

function CustomListEditor({ list, fields, updateList }:{ list:any[], fields:any[], updateList: (e:any[]) => void }) {
    const [showModal, setShowModal] = useState(false);

    const [selItem, setSelItem] = useState({});
    const [selIdx, setSelIdx] = useState(-1);

    const [dragItem, setDragItem] = useState<number | null>(null);
    const [draggedOverItem, setDraggedOverItem] = useState<number | null>(null);

    // const dragItem = useRef<number | null>(null), draggedOverItem = useRef<number | null>(null);

    const toggleEditWindow = (item: any, idx: number, toggle=true) =>{
        try {
            setSelItem(item);
            setSelIdx(idx);
            setShowModal(toggle);
        }
        catch(ex){
            log.error(`Toggle Edit Window: ${ex}`);
        }
    }

    const addNewItem = () => {
        try {
            updateList([{ id: uuidv4() }, ...list]);
            toggleEditWindow({},0);
        }
        catch(ex){
            log.error(`Adding New Item: ${ex}`);
        }
    }

    const saveItem = (idx: number, item: any, remove=false) =>{
        try {
            if(idx < list.length){
                let tmpList = _.cloneDeep(list);
                if(remove && window.confirm(`Are you sure you want to remove this item?`)){
                        tmpList.splice(idx, 1);
                }
                else if(!remove){
                    tmpList[idx] = {...item, ...("_id" in item ? {} : { _id: uuidv4() })};
                }

                updateList(tmpList);
            }
        }
        catch(ex){
            log.error(`Saving Item: ${ex}`);
        }
    }

    const handleDragStart = (idx: number) => {
       setDragItem(idx);
    }

    const handleDragEnter = (idx: number) => {
       setDraggedOverItem(idx);
    }

    const handleDrop = () => {
        try {
            if(dragItem != null && draggedOverItem != null) {
                const newItems = [...list];
                const draggedItemContent = newItems[dragItem];
                newItems.splice(dragItem, 1); // Remove from original position
                newItems.splice(draggedOverItem, 0, draggedItemContent); // Insert at new position
                
                updateList(newItems);
                setDragItem(null);
                setDraggedOverItem(null);
            }
        }
        catch(ex){
            log.error(`Handling Drag Drop: ${ex}`);
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
       e.preventDefault(); // Allow dropping
    }

    return(
        <div className="cle-container">
            <Slider {...(window.innerWidth > 770 ? settings : mini_settings)}>
                <div className="cle-outer-container">
                    <div className="cle-add-container" onClick={addNewItem}>
                        <span className="material-symbols-outlined">add</span>
                    </div>
                </div>
                {list.map((item: any, i: number) =>
                    <div className={`cle-outer-container ${dragItem === i ? 'dragging' : ''} ${draggedOverItem === i ? 'dragged-over' : ''}`} key={i} draggable={true}
                        onDragStart={(e) => handleDragStart(i)}
                        onDragEnter={(e) => handleDragEnter(i)}
                        onDragEnd={handleDrop} onDragOver={handleDragOver}
                    >
                        <div className="cle-btn-container">
                            <div className="cle-btn cle-edit" onClick={()=> toggleEditWindow(item, i)}>
                                <span className="material-symbols-outlined">edit_square</span>
                            </div>
                            <div className="cle-btn cle-remove" onClick={()=> saveItem(i, null, true)}>
                                <span className="material-symbols-outlined">close</span>
                            </div>
                        </div>
                        <div className="cle-item-container">
                            {fields.slice(0,3).map((field:any, j:number)=>
                                <div className={`field-item ${(field?.type === "images") ? "img-item" : ""}`} key={j}>
                                    <CustomItemPreview field={field} item={item} />
                                </div>
                            )}
                            {fields.length > 2 && <div className="more-items-indicator">Additional Fields...</div>}
                        </div>
                    </div>
                )}
            </Slider>

            {/* Edit Modal */}
            <CustomItemEditor show={showModal} closeAction={()=> { toggleEditWindow({}, -1, false)}} 
                selItem={selItem} selIdx={selIdx} fields={fields} saveItem={saveItem} />
        </div>
    );
}

function KeyEditorTile({ pageKey, updatePageData }: KeyEditorTileType){
    const fullTiles: {[key: string]: boolean} = { "custom_list": true };

    const getTileIcon = () => {
        try {
            switch(pageKey?.type){
                case "title":
                    return <span className="material-symbols-outlined">title</span>;
                case "description":
                    return <span className="material-symbols-outlined">description</span>;
                case "list":
                    return <span className="material-symbols-outlined">list</span>;
                case "images":
                    return <span className="material-symbols-outlined">photo_library</span>;
                case "custom_list":
                    return <span className="material-symbols-outlined">view_list</span>;
                default:
                    return <></>;
            }
        }
        catch(ex){
            log.error(`Getting Tile Icon: ${ex}`);
        }
    }

    const defaultHandleChange = (e:any) => {
        try {
            if(pageKey._id){
                updatePageData(e.target.value);
            }
        }
        catch(ex){
            log.error(`Handle Default Change: ${ex}`);
        }
    }

    const quillHandleChange = (value:any) => {
        try {
            if(pageKey._id){
                updatePageData(value);
            }
        }
        catch(ex){
            log.error(`Handle Quill Change: ${ex}`);
        }
    }

    const getTileContentEditor = () => {
        try {
            switch(pageKey?.type){
                case "title":
                    return <textarea name={`${pageKey?.title}`} rows={3} value={pageKey?.value?.data} onChange={defaultHandleChange} />;
                case "description":
                    return <ReactQuill theme="snow" value={pageKey?.value?.data} onChange={quillHandleChange} 
                                modules={quillSetup.modules} formats={quillSetup.formats} className="admin-quill"
                            />;
                case "list":
                    return <PillListEditor list={pageKey?.value?.data} updateList={quillHandleChange} />;
                case "images":
                    return <ImageEditor selected={pageKey?.value?.data} maxSelect={pageKey?.metaData?.max} tag={pageKey?.metaData?.tag} updateList={quillHandleChange}/>;
                case "custom_list":
                    return <CustomListEditor list={(pageKey?.value?.data?.length === 0 ? [] : pageKey?.value?.data)} fields={pageKey?.metaData?.fields} updateList={quillHandleChange}/>;
                default:
                    return <></>;
            }
        }
        catch(ex){
            log.error(`Getting tile content editor: ${ex}`);
        }
    }

    return(
        <div className={`key-editor-tile-container ${pageKey?.type && pageKey.type as string in fullTiles ? 'sz-10' : ''}`}>
            <div className="key-tile-title">
                <span className="tile-title">{pageKey.title}</span>
                <div className="title-icon-container">{getTileIcon()}</div>
            </div>

            <div className="tile-content-editor-container">
                {getTileContentEditor()}
            </div>
        </div>
    );
}

export default function SiteEditor(){
    const [selPage, setSelPage] = useState("");
    const [selPageData, setSelPageData] = useState<SitePage | null>(null);
    const [keyChanges, setKeyChanges] = useState(false);

    const pillScrollRef = useRef<HTMLDivElement>(null);

    const { user } = useContext(userContext.UserContext) as UserContextType;
    
    const blocker = useBlocker(keyChanges);

    // GQL Queries
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [retrievePages,{ loading: site_pages_loading, data: site_pages_data }] = useLazyQuery(GET_SITE_PAGES_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    const [retrievePage,{ loading: site_page_loading, data: site_page_data, refetch: site_page_refetch }] = useLazyQuery(GET_IND_SITE_PAGE_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});

    // Mutations
    const [upsertPage,{ loading: upsert_pg_loading, data: upsert_pg_data }] = useMutation(UPSERT_PAGE_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });

    /* Application Functions*/
    const controlSlider = (ref:any, dir:string) => {
        try {
            let offsetWidth = ref.current.offsetWidth,
                scrollWidth = ref.current.scrollWidth;

            if(scrollWidth > offsetWidth){
                let scrollSz = (offsetWidth <= 770 ? 220 : ((scrollWidth - offsetWidth) / 2)),
                    newScrollLeft = ref.current.scrollLeft;

                if(dir === "prev"){
                    newScrollLeft = ref.current.scrollLeft - scrollSz;
                }
                else if(dir === "next"){
                    newScrollLeft = ref.current.scrollLeft + scrollSz;
                }

                ref.current.scrollLeft = newScrollLeft;
            }
        }
        catch(ex){
            log.error(`Error Controlling Slider: ${ex}`);
        }
    }

    /* Data Functions */
    const savePage = () => {
        try {
            if(!selPageData?.title){
                toast.warning(`Please make sure the page has a title`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                const cleanKeys = selPageData.pageKeys.map((key)=> {
                    const tmpKey = { 
                        _id: key._id, title:key.title, metaData:key.metaData, 
                        type:key.type, value:key.value
                    };

                    return tmpKey;
                });

                upsertPage({ variables: { 
                    _id: selPageData._id, title: selPageData.title, pageKeys: cleanKeys
                }});
                setKeyChanges(false);
            }
        }
        catch(ex){
            log.error(`Saving Site Page: ${ex}`);
        }
    }

    const updateKey = (key_idx: number, data: any) => {
        try {
            setKeyChanges(true);
            setSelPageData((d:any) => {
                const tmp = _.cloneDeep(d);
                tmp.pageKeys[key_idx].value = { data: data };

                return tmp;
            });
        }
        catch(ex){
            log.error(`Updating Key: ${ex}`);
        }
    }

    const onConfirmAction = (key?: string, confirm?: boolean) => {
        try {
            if(!confirm){
                togglePage(key, true);
            }
            toast.dismiss();
        }
        catch(ex){
            log.error(`On Confirm Action: ${ex}`);
        }
    }

    const togglePage = (key?: string, overwrite: boolean = false) => {
        try {
            if(key){
                if(!keyChanges || overwrite){
                    setSelPage(key);
                    setKeyChanges(false);
                }
                else {
                    toast(<ConfirmToastContent onConfirm={()=> onConfirmAction(key, true)} 
                        onCancel={()=> onConfirmAction(key, false)}
                        message="Do you need to save changes to current page before switching?"
                        confirmText="Yes, Go Back" cancelText="No, Switch Anyway" 
                    />, { position: "top-right", autoClose: false, closeOnClick: false, 
                        draggable: false, theme: "light" })
                }
            }
        }
        catch(ex){
            log.error(`Toggling Page: ${ex}`);
        }
    }

    useEffect(()=> {
        if(selPage) {
            retrievePage({ variables: { key: selPage }});
        }
        else if(selPageData){
            setSelPageData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[selPage]);

    useEffect(()=>{
        if(site_page_data?.sitePage){
            const sp = _.cloneDeep(site_page_data.sitePage);
            setSelPageData(sp);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[site_page_data]);

    // Refresh Page Data On Completion of action
    useEffect(()=>{ 
        if(!site_pages_loading && !upsert_pg_loading && upsert_pg_data?.upsertSitePage){
            toast.success(`Update Site Page.`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });

            site_page_refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_pg_loading]);

    useEffect(()=>{
        if(blocker.state === 'blocked'){
            toast(<ConfirmToastContent onConfirm={()=> { toast.dismiss(); blocker.proceed(); }} 
                    onCancel={()=> toast.dismiss()}
                    message="Are you sure you want to leave? Your changes will not be saved."
                    confirmText="Yes" cancelText="No, Go Back" 
                />, { position: "top-right", autoClose: false, closeOnClick: false, 
                        draggable: false, theme: "light" })
        }
    },[blocker]);

    useEffect(()=> { 
        retrievePages({}); 
        document.title = "Site Editor";
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    return(
        <div className="admin-component site-editor">
            <div className="table-action-container">
                <div className="pill-list-container">
                    <span className="material-symbols-outlined ctrl" onClick={()=> controlSlider(pillScrollRef, "prev")}>chevron_left</span>
                    <div className="scroll-pill-list" ref={pillScrollRef}>
                        {site_pages_data?.sitePages.map((pg: SitePage, i: number)=>
                            <div className={`pill-item ${pg.key === selPage ? 'sel' : ''}`} key={i} onClick={()=> { togglePage(pg.key); }}>{pg.title}</div>
                        )}
                    </div>
                    <span className="material-symbols-outlined ctrl" onClick={()=> controlSlider(pillScrollRef, "next")}>chevron_right</span>
                </div>
            </div>

            {site_page_loading ?
                <div className="admin-loading">
                    <l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)" />
                </div> :
                <>
                    {!selPageData ? 
                        <div className="admin-loading">
                            <p>Please select a site page to begin making changes</p>
                        </div> :
                        <>
                            <div className="page-title-container">
                                <h2>{selPageData?.title}</h2>

                                <div className="title-btn-container bookend">
                                    <div className={`add-key-btn ${keyChanges ? '' : 'disabled'}`} onClick={savePage}>
                                        <span className="material-symbols-outlined">save</span>
                                        <span>Save</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add Page Tiles */}
                            <div className="admin-editor-tile-container">
                                {selPageData?.pageKeys.map((key,i) =>
                                    <KeyEditorTile pageKey={key} updatePageData={(data) => updateKey(i, data)} key={i}/>
                                )}
                            </div>
                        </>
                    }
                </>
            }
        </div>
    );
}