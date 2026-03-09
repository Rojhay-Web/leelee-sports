import { useState, useEffect, useContext, useRef } from 'react';
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { toast } from 'react-toastify';
import * as _ from 'lodash';

import { spiral, quantum } from 'ldrs';
import Rodal from 'rodal';
import 'rodal/lib/rodal.css';

import SelectedPhotosCtrl from './selectedPhotoCtrl';
import GalleryPagination from './galleryPagination';

import userContext from '../../../context/user.context';

import { FilePhoto, Photo, UserContextType } from '../../../datatypes';
import { API_URL, emptyList, handleGQLError } from '../../../utils';
import { UploadImageComponent } from './uploadImageBtn';
import { log } from '../../../utils/log';

const MAX_GALLERY_PAGE_SZ = 12;
const SEARCH_PHOTOS_QUERY = gql`
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
ADD_PHOTOS_TO_SET = gql`
    mutation AddPhotosToSet($id:String!, $photoIds: [String]!){
        addPhotosetPhotos(id:$id, photoIds: $photoIds)
    }`;

type GalleryCtrlModalType = {
    visible: boolean, maxSelect: number, tag: string,
    tabs: string[], closeAction: (photoset: FilePhoto[]) => void,

    secondActionLoading: boolean, hasSecondAction?:boolean,
    secondActionTitle?:string, secondActionStatus?:boolean, 
    selectedImages?: FilePhoto[],
    secondAction: (tab: string, ids: string[], photoset: FilePhoto[]) => void,

    customWidth?:number, customHeight?:number
};

type GallerySectionType = {
    maxSelect: number, tag: string,
    selectedImages?: FilePhoto[],
    checkClose: (photoset: FilePhoto[]) => void,

    secondActionLoading: boolean, hasSecondAction?:boolean,
    secondActionTitle?:string, secondActionStatus?:boolean, 
    secondAction: (ids: string[], photoset: FilePhoto[]) => void,
};

type PanelActionPageType = {
    panelPage: string, step1Completion: boolean,
    hasSecondAction: boolean, step2Completion: boolean, selected: FilePhoto[],
    secondActionTitle?: string, 
    checkCloseAction: () => void,
    setDisplayPanelPage: React.Dispatch<React.SetStateAction<boolean>>
};

function PanelActionPage({ panelPage, selected, step1Completion, step2Completion, hasSecondAction, secondActionTitle, checkCloseAction, setDisplayPanelPage }:PanelActionPageType) {
    useEffect(()=> { quantum.register(); },[]);

    return(
        <div className='action-panel'>
            <div className='panel-steps'>
                {/* Step 1 */}
                <div className={`step ${panelPage === "step_1" ? "active" : ""}`}>
                    <div className={`step-icon ${step1Completion ? 'complete' : ''}`}>
                        <span className="material-symbols-outlined">task_alt</span>
                    </div>
                    <span className='title'>Uploading</span>
                </div>

                {/* Step 2 */}
                {hasSecondAction ?
                    <div className={`step ${panelPage === "step_2" ? "active" : ""}`}>
                        <div className={`step-icon ${step2Completion ? 'complete' : ''}`}>
                            <span className="material-symbols-outlined">task_alt</span>
                        </div>
                        <span className='title'>{secondActionTitle}</span>
                    </div> : <></>
                }
            </div>

            <div className='panel-content'>
                {selected &&
                    <SelectedPhotosCtrl maxSelect={selected.length} selected={selected} displayOnly={true} uploadFlag={false} selecting={false} setCompleted={()=>{}} toggleImage={()=>{}} />
                }

                {panelPage === "step_1" || panelPage === "step_2" ? 
                    <>
                        <span className='panel-content-text title'>Please wait as we finish working with your images</span>
                        <div className='loading-animation'>
                            <l-quantum size="150" speed="2.0" color="rgba(150,150,150,1)" />
                            <span className='panel-content-text'>{panelPage === "step_1" ? "Uploading" : secondActionTitle }</span>
                        </div>
                    </> : <></>
                }

                {panelPage === "complete" ? 
                    <>
                        <span className='panel-content-text title'>Success</span>
                        <span className='panel-content-text'>Feel free to navigate back by closing the modal</span>
                        <div className='action-link-container'>
                            <div className='action-link more' onClick={() => { setDisplayPanelPage(false); }}>Upload More Images</div>
                            <div className='action-link cancel' onClick={checkCloseAction}>Close</div>
                        </div>
                    </> : <></>
                }
            </div>
        </div>
    );
}

function GallerySelect({ maxSelect, tag, hasSecondAction = false, secondActionStatus, secondActionLoading, selectedImages, secondAction, secondActionTitle="Choose Image(s)", checkClose }: GallerySectionType){
    const [selected, setSelected] = useState<FilePhoto[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selecting, setSelecting] = useState(false);
    const [panelPage, setPanelPage] = useState("");

    // Upload
    const [uploading, setUploading] = useState(false);
    const [displayPanelPage, setDisplayPanelPage] = useState(false);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    const selectedDict = useRef<{[key:string]:FilePhoto}>({});
    const fileUpload = useRef<HTMLInputElement>(null);
    
    // GQL Queries
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [retrieveAllImages,{ loading, data }] = useLazyQuery(SEARCH_PHOTOS_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    // Mutations
    const [addPhotos,{ loading: add_photos_loading, data: add_photos_data }] = useMutation(ADD_PHOTOS_TO_SET, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });

    const updatePage = (dir:number) => {
        try {
            if((dir < 0 && currentPage > 1) || (dir > 0 && data?.photos?.pagesLeft)) {
                setCurrentPage((d)=>{
                    return d + dir;
                });
            }
        }
        catch(ex){
            log.error(`Updating Page: ${ex}`);
        }
    }

    const toggleImage = (photo: FilePhoto) =>{
        try {
            if(photo._id in selectedDict.current){
                delete selectedDict.current[photo._id];
            }
            else if(selected.length >= maxSelect){
                toast.warning(`You have reached the max selection size`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                selectedDict.current[photo._id] = {...photo, type: "image"};
            }

            const selList = Object.values(selectedDict.current);
            setSelected(selList);
        }
        catch(ex){
            log.error(`Toggling Photo: ${ex}`);
        }
    }

    const checkCloseAction = () => {
        let tmpSel = _.cloneDeep(selected);

        setSelecting(false); 
        setDisplayPanelPage(false);
        setCurrentPage(1); 
        setSelected([]); 
        setPanelPage("");
        selectedDict.current = {};

        checkClose(tmpSel);
    }

    const beginSecondAction = () => {
        try {
            if(selected?.length > 0){
                setSelecting(true); 
                setPanelPage((hasSecondAction ? "step_2" : "complete"));

                if(hasSecondAction){
                    let idList = selected.filter((c)=> { return c._id != null }).map((c1) => { return c1._id ?? ""; });
                    secondAction(idList, selected);
                }
            }
        }
        catch(ex){
            log.error(`Beginning Second Action: ${ex}`);
        }
    }

    const sliceData = (full_data:any[]):any[] => {
        let ret: any[] = [];
        try{
            if(!full_data) {
                return [[],[],[]];
            }

            const MAX_ROWS = 3, MAX_COL = 4;
            for(let i=0; i < MAX_ROWS; i++){
                const st = i * MAX_COL;
                ret.push(full_data.slice(st, st + MAX_COL) ?? []);
            }
        }
        catch(ex){
            log.error(`Slicing Data: ${ex}`);
            ret = [[],[],[]];
        }
        
        return ret;
    }

    const addImageToSet = () => {
        try {
            // Add Image(s) to Set
            if(selected?.length > 0){
                let idList = selected.filter((c)=> { return c._id != null }).map((c1) => { return c1._id ?? ""; });
                addPhotos({ variables: { id: tag, photoIds: idList }});
            }
        }
        catch(ex){
            log.error(`Add Image To Photoset`)
        }
    }

    /* Selecting */
    useEffect(()=>{
        if(!loading && !displayPanelPage){
            retrieveAllImages({ variables: { page: currentPage, pageSize: MAX_GALLERY_PAGE_SZ }});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[currentPage, displayPanelPage]);

    useEffect(()=> {
        if(!secondActionLoading && secondActionStatus && panelPage === "step_2"){
            setPanelPage("complete");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[secondActionStatus]);

    useEffect(()=>{
        if(!add_photos_loading && add_photos_data?.addPhotosetPhotos) {
            beginSecondAction();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[add_photos_data]);

    useEffect(() =>{
        if(uploading || selecting){
            setDisplayPanelPage(true);
        }
    },[uploading, selecting]);

    useEffect(()=>{
        if(selectedImages){
            let selDict: {[key:string]:FilePhoto} = {};
            
            selectedImages?.forEach((img) => {
                selDict[img._id] = img;
            });

            selectedDict.current = selDict;
        }
    },[selectedImages]);

    useEffect(()=> { spiral.register(); },[]);

    return(
        <div className='gallery-section select'>
            {/* Upload Item Logic */}
            <UploadImageComponent tag={tag} fileUpload={fileUpload} 
                maxSelect={maxSelect} hasSecondAction={hasSecondAction} 
                secondAction={secondAction} setPanelPage={setPanelPage} 
                uploading={uploading} setUploading={setUploading}
            />

            {!selecting && !uploading && !displayPanelPage ?
                <>
                    <div className='btn-container top'>                        
                        <div className={`action-btn save ${selected?.length <= 0 ? 'disable':''}`} onClick={addImageToSet}>{secondActionTitle}</div>
                        <div className='action-btn default' onClick={()=> { fileUpload?.current?.click(); }}>Upload Image(s)</div>
                    </div>

                    {/* Display Selected Gallery */}
                    <div className='section-content image-container'>
                        {loading ? 
                            <div className="admin-loading">
                                <l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)" />
                            </div> :
                            <>
                                
                                {sliceData(data?.photos?.results).map((photo_row: Photo[], j:number) =>
                                    <div className='photo-container-row-container' key={j}>
                                        {photo_row.map((photo:Photo, i:number) =>
                                            <div className={`photo-container ${photo._id in selectedDict.current ? 'sel' : ''}`} key={`${j}-${i}`} onClick={()=> { toggleImage({...photo, type: "image"}); }}>
                                                <img src={`${API_URL}/kaleidoscope/${photo._id}`} alt={`${photo?.title}`}/>
                                            </div>
                                        )}
                                        {photo_row && emptyList(4 - (photo_row?.length)).map((e)=> 
                                            <div className='photo-container empty' key={`empty-${e}`} />
                                        )}
                                    </div>
                                )}                                
                            </>
                        }
                    </div>

                    <GalleryPagination page={currentPage} hasPagesLeft={data?.photos?.pagesLeft} updatePage={updatePage} />
                </> :
                <PanelActionPage panelPage={panelPage} step1Completion={selecting} selected={selected}
                    hasSecondAction={hasSecondAction} step2Completion={secondActionStatus ? true : false}
                    secondActionTitle={secondActionTitle} checkCloseAction={checkCloseAction}
                    setDisplayPanelPage={setDisplayPanelPage}
                />
            }
        </div>
    );
}

function GalleryCtrlModal({ 
    visible, tabs, maxSelect, tag, closeAction, 
    secondActionLoading, hasSecondAction, selectedImages,
    secondActionTitle, secondActionStatus, secondAction,
    customWidth, customHeight
}: GalleryCtrlModalType){
    const [selectedTab, setSelectedTab] = useState("");
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    const calcModalSize = () => {
        let ret = { width: 400, height: 300 };
        try {
            ret.width = customWidth ?? (windowSize.width > 832 ? 800 : .85 * windowSize.width);
            ret.height = customHeight ?? (windowSize.height < 200 ? 200 : .85 * windowSize.height);
        }
        catch(ex){
            log.error(`Calculating Modal Size: ${ex}`);
        }
        return ret;
    }

    useEffect(()=>{
        if(tabs?.length > 0){
            setSelectedTab(tabs[0]);
        }
    },[tabs]);

    useEffect(()=> {
        function handleResize() {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        }
      
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize); 
    },[]);

    return(
        <Rodal className="admin-image-mapper-container" visible={visible} onClose={() => { closeAction([]); }} 
            width={calcModalSize().width} height={calcModalSize().height}>
            <div className='mapper-content'>
                <GallerySelect maxSelect={maxSelect} tag={tag}
                    secondActionLoading={secondActionLoading} selectedImages={selectedImages}
                    hasSecondAction={hasSecondAction} secondActionStatus={secondActionStatus}
                    secondAction={(ids: string[], photoset: FilePhoto[]) => {secondAction(selectedTab, ids, photoset); }} 
                    secondActionTitle={secondActionTitle} checkClose={closeAction} />
            </div>
        </Rodal>
    );
}

export default GalleryCtrlModal;