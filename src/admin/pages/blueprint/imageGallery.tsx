import { useContext, useEffect, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { toast } from "react-toastify";
import * as _ from 'lodash';
import { spiral } from 'ldrs';

import userContext from "../../../context/user.context";
import GalleryCtrlModal from "../../components/blueprint/galleryCtrlModal.v2";
import GalleryPagination from "../../components/blueprint/galleryPagination";

import { Photosets, Photo, UserContextType, FilePhoto } from "../../../datatypes";
import { API_URL, handleGQLError } from "../../../utils";
import { UploadImageComponent } from "../../components/blueprint/uploadImageBtn";
import { log } from "../../../utils/log";

const GALLERY_PAGE_SIZE = 16;

/* GQL */
const GET_PHOTOSETS_QUERY = gql`
    query getPhotosets($page: Int, $pageSize:Int) {
        photosets(page:$page, pageSize:$pageSize){
            pagesLeft
            results {
                _id
                title
                description
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
            }
        }
    }`, 
GET_PHOTOSET_PHOTOS_QUERY = gql`
     query getPhotosetImages($id:String!, $page: Int, $pageSize:Int){
        photosetImages(id:$id, page:$page, pageSize:$pageSize){
            pagesLeft
            results {
                _id
                title
                created
            }
        }
    }`,
REMOVE_FROM_PHOTOSET = gql`
     mutation removePhotosFromPhotoset($id: String!, $photoIds:[String]!){
	    removePhotosetPhotos(id: $id, photoIds: $photoIds)
    }`,
EDIT_PHOTOSET = gql`
    mutation editPhotosetInfo($id:String!, $title:String!, $description:String){
       editPhotoset(id: $id, title: $title, description: $description)
    }`,
DELETE_PHOTOSET = gql`
    mutation deletePhotoset($id:String!){
       deletePhotoset(id: $id)
    }`,
CREATE_PHOTOSET = gql`
    mutation createPhotoset($title:String!, $description:String){
       createPhotoset(title:$title, description:$description)
    }`,
DELETE_PHOTO = gql`
    mutation removePhoto($id: String!){
       deletePhoto(id: $id)
    }`;

function ImageGallery(){
    const [selPhotoset, setSelPhotoset] = useState<Photosets | null>(null);
    const [displayPhotos, setDisplayPhotos] = useState<Photo[]>([]);
    const [displayPhotosets, setDisplayPhotosets] = useState<Photosets[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasPagesLeft, setHasPagesLeft] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [tabs, setTabs] = useState<string[]>([]); 

    const [uploading, setUploading] = useState(false);

    const pillScrollRef = useRef<HTMLDivElement>(null);
    const pageRender = useRef(false);
    const pagesLeft = useRef({ photos: true, photosets: true });
    const fileUpload = useRef<HTMLInputElement>(null);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    // GQL Queries
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [retrievePhotosets,{ data: photosets_data }] = useLazyQuery(GET_PHOTOSETS_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    const [retrieveAllImages,{ loading: photos_loading, data: photos_data, refetch: photos_refetch }] = useLazyQuery(SEARCH_PHOTOS_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    const [retrieveGalleryImages,{ loading: photoset_photos_loading, data: photoset_photos_data, refetch: photoset_photos_refetch }] = useLazyQuery(GET_PHOTOSET_PHOTOS_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});

    // Mutations
    const [removePhotosFromSet,{ loading: remove_photos_loading, data: remove_photos_data }] = useMutation(REMOVE_FROM_PHOTOSET, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [editPhotoset,{ loading: edit_photoset_loading, data: edit_photoset_data }] = useMutation(EDIT_PHOTOSET, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [deletePhotoset,{ loading: delete_photoset_loading, data: delete_photoset_data }] = useMutation(DELETE_PHOTOSET, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [createNewPhotoset,{ loading: create_photoset_loading, data: create_photoset_data }] = useMutation(CREATE_PHOTOSET, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [removePhoto,{ loading: delete_photo_loading, data: delete_photo_data }] = useMutation(DELETE_PHOTO, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    
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

    const updatePage = (dir:number) => {
        try {
            if((dir < 0 && currentPage > 1) || (dir > 0 && hasPagesLeft)) {
                setCurrentPage((d)=>{
                    return d + dir;
                });
            }
        }
        catch(ex){
            log.error(`Updating Page: ${ex}`);
        }
    }

    const handleChange = (e:any) => {
        try {
            let { name, value } = e.target;

            if(selPhotoset) {
                setSelPhotoset((d: any)=> {
                    let tmp = _.cloneDeep(d);
                    return {...tmp, [name]:value };
                });
            }
        }
        catch(ex){
            log.error(`Updating Page: ${ex}`);
        }
    }

    const createPhotoset = () =>{
        try {
            if(selPhotoset && !selPhotoset?._id){
                setSelPhotoset(null);
            }
            else {
                 setSelPhotoset({ title: "", description: "" });
            }
        }
        catch(ex){
            log.error(`Creating Photoset: ${ex}`);
        }
    }

    const getImages = () => {
        try {
            if(selPhotoset === null){
                retrieveAllImages({ variables: { page: currentPage, pageSize: GALLERY_PAGE_SIZE }});
            }
            else if(!selPhotoset?._id){
                setDisplayPhotos([]);
            }
            else {
                retrieveGalleryImages({ variables: { id: selPhotoset._id, page: currentPage, pageSize: GALLERY_PAGE_SIZE }});
            }
        }
        catch(ex){
            log.error(`Getting Photos: ${ex}`);
        }
    }

    const getMapperTabs = () => {
        try {
            setTabs((selPhotoset ? ["image selection","upload new images"] : ["upload new images"]));
        }
        catch(ex){
            log.error(`Getting Mapper Tabs: ${ex}`);
        }
    }

    const closeModal = (_photoset: FilePhoto[]) => {
        try {
            if(selPhotoset?._id){
                if(currentPage === 1){
                    photoset_photos_refetch();                    
                }
                else {
                    setCurrentPage(1);
                }
            }
            else if(selPhotoset){
                retrievePhotosets({ variables: { page: 1, pageSize: 15 }}); 
                setSelPhotoset(null);
            }
            else {
                if(currentPage === 1){
                    photos_refetch();
                }
                else {
                    setCurrentPage(1);
                }
            }

            setOpenModal(false);
        }
        catch(ex){
            log.error(`Closing Modal: ${ex}`);
        }
    }

    const deletePhoto = (id:String) => {
        if(window.confirm(`Are you sure you want to ${selPhotoset?._id ? 'REMOVE this photo from the set':'DELETE this photo perminantly'}?`)){
            if(selPhotoset?._id){
                removePhotosFromSet({ variables: { id:selPhotoset?._id, photoIds: [id] }});
            }
            else {
                removePhoto({ variables: { id:id }});
            }
        }
    }

    const updatePhotoset = () =>{
        if(!selPhotoset?.title || selPhotoset?.title.length <= 0){
            toast.warning(`Please Insert A Gallery Title`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: false,
                draggable: true, progress: undefined, theme: "light" });
        }
        else {
            editPhotoset({ variables: { id:selPhotoset?._id, title:selPhotoset?.title, description:selPhotoset?.description }});
        }
    }

    const generatePhotoset = () =>{
        if(!selPhotoset?.title || selPhotoset?.title.length <= 0){
            toast.warning(`Please Insert A Gallery Title`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: false,
                draggable: true, progress: undefined, theme: "light" });
        }
        else {
            createNewPhotoset({ variables: { title:selPhotoset?.title, description:selPhotoset?.description }});
        }
    }

    const removePhotoset = () =>{
        if(window.confirm('Are you sure you want to DELETE this album PERMANENTLY?')){
            deletePhotoset({ variables: { id:selPhotoset?._id }});
        }
    }

    // Second Action Sets
    const getSecondActionTitle = () => {
        let ret: string | undefined = undefined;
        try {
            if(selPhotoset?._id) {
                ret = "Add To Set";
            }
            else if(selPhotoset){
                ret = "Create New Gallery";
            }
        }
        catch(ex){
            log.error(`Getting Second Action Title: ${ex}`);
        }

        return ret;
    }

    // Upload Function
    const addImageToggle = () => {
        try {
            if(selPhotoset){
                setOpenModal(true);
            }
            else {
                fileUpload?.current?.click();
            }
        }
        catch(ex){
            log.error(`Adding Image Toggle: ${ex}`);
        }
    }

    /* Data Functions */
    useEffect(()=>{ 
        getMapperTabs(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[selPhotoset]);

    useEffect(()=>{
        if(currentPage > 1){
            setCurrentPage(1);
        }
        else {
            getImages();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[selPhotoset?._id]);

    useEffect(()=> {
        if(pageRender?.current) {
            getImages();
        }

        pageRender.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[currentPage]);

    /* Data Based on Action */
    useEffect(()=>{
        if(photos_data?.photos) {
            setDisplayPhotos(photos_data?.photos?.results);
            setHasPagesLeft(photos_data?.photos?.pagesLeft);
        }
    },[photos_data]);

    useEffect(()=>{
        if(photoset_photos_data?.photosetImages) {
            setDisplayPhotos(photoset_photos_data?.photosetImages?.results);
            setHasPagesLeft(photoset_photos_data?.photosetImages?.pagesLeft);
        }
    },[photoset_photos_data]);

    useEffect(()=>{
        if(photosets_data?.photosets) {
            setDisplayPhotosets(photosets_data?.photosets?.results);
            pagesLeft.current.photosets = photosets_data?.photosets?.pagesLeft;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[photosets_data]);

    /* Remove Photos */
    useEffect(()=>{
        if(!delete_photo_loading && delete_photo_data?.deletePhoto){
            photos_refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[delete_photo_loading]);

    useEffect(()=>{
        if(!remove_photos_loading && remove_photos_data?.removePhotosetPhotos){
            photoset_photos_refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[remove_photos_loading]);

    /* Update Photosets */
    useEffect(()=>{
        if((!delete_photoset_loading && delete_photoset_data?.deletePhotoset) ||
        (!edit_photoset_loading && edit_photoset_data?.editPhotoset) ||
        (!create_photoset_loading && create_photoset_data?.createPhotoset)){
            retrievePhotosets({ variables: { page: 1, pageSize: 15 }}); 
            setSelPhotoset(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[delete_photoset_loading, edit_photoset_loading, create_photoset_loading]);

    useEffect(()=> { 
        retrievePhotosets({variables: { page: 1, pageSize: 15 }}); 
        spiral.register(); 
        document.title = "Image Gallery";
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    return (
        <div className="admin-component image-gallery">
            <div className="table-action-container padded-container">
                <div className="pill-list-container">
                    <span className="material-symbols-outlined ctrl" onClick={()=> controlSlider(pillScrollRef, "prev")}>chevron_left</span>
                    <div className="scroll-pill-list" ref={pillScrollRef}>
                        <div className={`pill-add-btn ${selPhotoset && !selPhotoset?._id ? "text" : ""}`} onClick={createPhotoset} title="Create New Gallery">
                            <span className="material-symbols-outlined">add</span>
                            <span className="new-page-title">New Gallery</span>
                        </div>

                        <div className={`all-item ${selPhotoset === null ? 'sel' : ''}`} onClick={()=> { setSelPhotoset(null); }}>All Images</div>

                        {displayPhotosets && displayPhotosets.map((pg: Photosets, i: number)=>
                            <div className={`pill-item ${pg._id === selPhotoset?._id ? 'sel' : ''}`} key={i} onClick={()=> { if(pg._id) setSelPhotoset(pg); }}>{pg.title}</div>
                        )}
                    </div>
                    <span className="material-symbols-outlined ctrl" onClick={()=> controlSlider(pillScrollRef, "next")}>chevron_right</span>
                </div>
            </div>
            
            <div className="page-title-container">
                {selPhotoset != null ?
                    <div className="editable-title">
                        <input className='title-input edit' type="text" name="title" placeholder="Enter Album Title..." value={selPhotoset?.title} onChange={handleChange} />
                        <input className='description-input edit' type="text" name="description" placeholder="Enter Album Description..." value={selPhotoset?.description} onChange={handleChange} />
                    </div>
                    : <></>
                }

                {selPhotoset && 
                    <div className="title-btn-container bookend">
                        {(!selPhotoset._id) ?
                            <>
                                <div className={`add-key-btn btn ${selPhotoset?.title?.length > 0 ? '' : 'hide'}`} onClick={generatePhotoset}>
                                    <span className="material-symbols-outlined">save</span>
                                    <span>Create Album</span>
                                </div>
                            </> :
                            <>
                                <div className={`add-key-btn btn ${selPhotoset?.title?.length > 0 ? '' : 'hide'}`} onClick={updatePhotoset}>
                                    <span className="material-symbols-outlined">save</span>
                                    <span>Save Album Info</span>
                                </div>
                                <div className={`add-key-btn btn remove`} onClick={removePhotoset}>
                                    <span className="material-symbols-outlined">delete</span>
                                    <span>Delete Album</span>
                                </div>
                            </>
                        }

                        <div className={`add-key-btn text ${selPhotoset?.title?.length > 0 ? 'no-show' : ''}`}>
                            <span className="material-symbols-outlined">info</span>
                            <span>Please add title and a description before saving this gallery</span>
                        </div>
                    </div>
                }
            </div>

            {(photos_loading || photoset_photos_loading || delete_photo_loading || remove_photos_loading || uploading) ?
                <div className="admin-loading">
                    <l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)"/>
                </div> : 
                <>
                    <div className="admin-gallery-container">
                        {!photos_loading &&
                            <>
                                <div className="photo-container add" onClick={addImageToggle}>
                                    <span className="material-symbols-outlined">cloud_upload</span>
                                    <span className="photo-text">Add/Upload New Image</span>
                                </div>

                                {displayPhotos.map((photo,i)=>
                                    <div className="photo-container" key={i} onClick={()=> { deletePhoto(photo._id); }}>
                                        <img src={`${API_URL}/kaleidoscope/${photo._id}`} alt="admin gallery item" />
                                    </div>
                                )}  
                            </>    
                        }
                    </div>

                    <GalleryPagination page={currentPage} hasPagesLeft={hasPagesLeft} updatePage={updatePage} />
                </>
            }

            {/* Upload Item Logic */}
            <UploadImageComponent maxSelect={15}
                fileUpload={fileUpload} hasSecondAction={true} 
                secondAction={()=> { getImages(); }} setPanelPage={()=>{}} 
                uploading={uploading} setUploading={setUploading}
            />

            {/* Gallery Ctrl */}
            <GalleryCtrlModal visible={openModal} tabs={tabs} maxSelect={(!selPhotoset || selPhotoset?._id ? 7 : 1)} secondActionTitle={getSecondActionTitle()}
                secondAction={()=> { closeModal([]); }} secondActionLoading={photoset_photos_loading} hasSecondAction={true} 
                secondActionStatus={photoset_photos_data?.photosetImages?.results?.length > 0} closeAction={closeModal} 
                tag={selPhotoset?._id ?? ""} />
        </div>
    );
}

export default ImageGallery;