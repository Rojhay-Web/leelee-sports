import { gql, useLazyQuery, useMutation } from "@apollo/client";
import { API_URL, emptyList, handleGQLError } from "../../../utils";
import { useEffect, useRef, useState } from "react";
import { spiral } from 'ldrs';
import { toast } from "react-toastify";

import GalleryCtrlModal from "../../../admin/components/blueprint/galleryCtrlModal.v2";
import { log } from "../../../utils/log";

import { FilePhoto } from "../../../datatypes";
type TagImageEditorType = { 
    tag: string,
    totalPhotos: number
}

const GET_PHOTOSET_IMAGES_QUERY = gql`
query getPhotosetImages($id:String!, $page: Int, $pageSize:Int){
    photosetImages(id: $id, page:$page, pageSize:$pageSize){
        pagesLeft
        results {
            _id
            title
        }
    }
}`,
REMOVE_PHOTOS_FROM_SET = gql`
mutation RemovePhotosFromSet($id:String!, $photoIds: [String]!){
    removePhotosetPhotos(id:$id, photoIds: $photoIds)
}`;

export default function TagImageEditor({ tag, totalPhotos }: TagImageEditorType){
    const [openModal, setOpenModal] = useState(false);

    const [selPhotoIdx, setSelPhotoIdx] = useState(-1);
    const [selectedPhoto, setSelectedPhoto] = useState<FilePhoto|undefined>(undefined);
    const [photoSet, setPhotoSet] = useState<FilePhoto[]>([]);

    const [elementSz, setElementSz] = useState({ width: 400, height: 400 });

    const imgEditorRef = useRef<HTMLDivElement>(null);

    const [retrievePhotosetImages,{ loading: photoset_images_loading, data: photoset_images_data }] = useLazyQuery(GET_PHOTOSET_IMAGES_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [removePhotos,{ loading: remove_photos_loading, data: remove_photos_data }] = useMutation(REMOVE_PHOTOS_FROM_SET, {fetchPolicy: 'no-cache', onError: handleGQLError });
    
    const tabs = ["image selection","upload new images"];

    const modalSecondAction = (tab: string) => {
        try {
            retrievePhotosetImages({ variables: { id:tag, page: 1, pageSize: totalPhotos }});

            if(tab === "upload new images") {
                setOpenModal(false);             
            } 
        }
        catch(ex){
            log.error(`Performing modal second action: ${ex}`);
        }
    }

    const checkOpenModal = () => {
        try {
            if((totalPhotos - photoSet?.length) <= 0){
                toast.warning(`You have reached the limit for images for this field.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                setOpenModal(true);
            }
        }
        catch(ex){
            log.error(`Checking Open Modal: ${ex}`);
        }
    }

    const removeSelectedPhoto = () => {
        if(!remove_photos_loading && selectedPhoto?._id && window.confirm(`Are you sure you want to remove this photo?`)){
            // REMOVE tag from image
            removePhotos({ variables: { id: tag, photoIds: [selectedPhoto._id] }});
        }
    }

    useEffect(()=>{
        if(selPhotoIdx >= 0 && selPhotoIdx < photoSet.length){
            setSelectedPhoto(photoSet[selPhotoIdx]);
        } else {
            setSelectedPhoto(undefined);
        }
    },[selPhotoIdx]);

    useEffect(()=>{
        setSelPhotoIdx((photoSet?.length > 0) ? 0 : -1);
    },[photoSet]);

    useEffect(()=>{
        if(tag){
            retrievePhotosetImages({ variables: { id: tag, page: 1, pageSize: totalPhotos }});
        }
    },[tag]);

    useEffect(()=>{
        if(!photoset_images_loading && photoset_images_data?.photosetImages){
            setPhotoSet(photoset_images_data.photosetImages?.results ?? []);
        }
    },[photoset_images_loading, photoset_images_data]);

    useEffect(()=>{
        if(!remove_photos_loading && remove_photos_data?.removePhotosetPhotos) {
           retrievePhotosetImages({ variables: { id: tag, page: 1, pageSize: totalPhotos }});           
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[remove_photos_loading, remove_photos_data]);

    useEffect(()=>{
        if(imgEditorRef.current){
            setElementSz((p: any) => {
                return { 
                    ...p, 
                    ...(imgEditorRef.current?.offsetWidth ? 
                        { width: (imgEditorRef.current.offsetWidth - 8) } : 
                        {}
                    )
                };
            });
        }
    },[imgEditorRef]);

    useEffect(()=> { spiral.register(); },[]);

    return (
        <>
            <div className={`tag-image-editor-container ${photoset_images_loading ? 'loading' : ''}`} ref={imgEditorRef}>
                <div className="selected-photo-container">
                    {selectedPhoto ?
                        <>
                            <button className="remove-photo-btn" onClick={removeSelectedPhoto}>
                                <span className="material-symbols-outlined">delete_forever</span>
                            </button>

                            <img src={`${API_URL}/kaleidoscope/${selectedPhoto._id}`} alt={`${selectedPhoto?.title}`}/>
                        </> :
                        <div className="empty-photo">
                            <span className="material-symbols-outlined">no_photography</span>
                        </div>
                    }   

                    {(remove_photos_loading || photoset_images_loading) &&
                        <div className="loader"><l-spiral size="50" speed="0.9" color="#fff" /></div>
                    }             
                </div>
                
                {totalPhotos > 1 &&
                    <div className="photoset-container">
                        <button className="page-ctrl" disabled={selPhotoIdx < 1} onClick={()=> {}}>
                            <span className="icon material-symbols-outlined">chevron_left</span>
                        </button>
                        
                        <div className="photoset-list-container">
                            {photoSet?.map((photo, i) =>
                                <button className={`set-list-photo ${i === selPhotoIdx ? 'sel' : ''}`} key={i} onClick={()=> setSelPhotoIdx(i) }>
                                    <img src={`${API_URL}/kaleidoscope/${photo._id}`} alt={`${photo?.title}`}/>
                                </button>
                            )}

                            {emptyList(totalPhotos - photoSet.length).map((e)=> 
                                <div className='set-list-photo empty' key={`empty-${e}`} />
                            )}
                        </div>

                        <button className="page-ctrl" disabled={(selPhotoIdx < 0 || selPhotoIdx >= (photoSet?.length - 1))} onClick={()=> {}}>
                            <span className="icon material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                }
                
                {photoSet?.length < totalPhotos &&
                    <button className="add-photo-btn" onClick={checkOpenModal}>
                        <span className="icon material-symbols-outlined">add_photo_alternate</span>
                        <span className="btn-title">{totalPhotos > 1 ? 'Add Photos' : 'Add Photo'}</span>
                    </button>
                }
            </div>

            <GalleryCtrlModal visible={openModal} tabs={tabs} tag={tag} maxSelect={(totalPhotos - photoSet?.length)} 
                secondActionTitle={totalPhotos > 1 ? 'Add Photos' : 'Add Photo'} selectedImages={photoSet}
                secondAction={modalSecondAction} secondActionLoading={photoset_images_loading} hasSecondAction={true} 
                secondActionStatus={!photoset_images_loading} closeAction={()=> setOpenModal(false)} 
                customWidth={elementSz?.width} customHeight={elementSz?.height}
            />
        </>
    );
}
