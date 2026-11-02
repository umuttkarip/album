import type {Asset} from './model';
export const DAYS_ALBUM_ID='photo-days';
export type LibraryPhoto=Asset & {album_title:string;album_deleted_at:number|null;created_at:number;captured_on:string|null;deleted_at:number|null;deleted_by:string|null};
export type PhotoPage={photos:LibraryPhoto[];next:string|null};
export type DaySettings={desktop_asset_id:string|null;mobile_asset_id:string|null;revision:number};
export type DaysData={albumId:string;month:string;photos:LibraryPhoto[];settings:DaySettings};
export function validDay(value:unknown):value is string {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function validMonth(value:unknown):value is string {return typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value);}
export function removedPhoto(photo:Pick<LibraryPhoto,'deleted_at'|'album_deleted_at'>){return !!(photo.deleted_at||photo.album_deleted_at);}
export function groupDays(photos:LibraryPhoto[]){const result=new Map<string,LibraryPhoto[]>();for(const photo of photos){if(!photo.captured_on||removedPhoto(photo))continue;const items=result.get(photo.captured_on)||[];items.push(photo);result.set(photo.captured_on,items);}return result;}
