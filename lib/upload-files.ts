export const PHOTO_ACCEPT='image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
export const STICKER_ACCEPT='image/png,image/webp,.png,.webp';

// FileList and the drag data store can be cleared as soon as their event ends.
export const snapshotFiles=(files:ArrayLike<File>|null|undefined):File[]=>Array.from(files||[]);
export const isFileDrag=(data:Pick<DataTransfer,'types'>)=>Array.from(data.types).includes('Files');

export async function imageMime(file:Blob){
  if(!file.size)throw new Error('Dosya boş. Başka bir fotoğraf seç.');
  if(file.size>30*1024*1024)throw new Error('En fazla 30 MB yüklenebilir.');
  const b=new Uint8Array(await file.slice(0,12).arrayBuffer());
  if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
  if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)return 'image/png';
  if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';
  throw new Error('JPEG, PNG veya WebP seç.');
}
