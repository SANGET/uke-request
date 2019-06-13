/* eslint-disable no-param-reassign */

import { LZMA } from 'lzma/src/lzma_worker';

function convertFormatedHexToBytes(hex: string) {
  let bytes = [];
  let c = 0;
  for (bytes = [], c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

function convertToFormatedHex(byteArr: number[]) {
  if (byteArr.length === 0) return false;
  let hexStr = "";
  let tmpHex;
  const len = byteArr.length;
  for (let i = 0; i < len; ++i) {
    if (byteArr[i] < 0) {
      byteArr[i] += 256;
    }
    tmpHex = byteArr[i].toString(16);
    if (tmpHex.length === 1) {
      tmpHex = `0${tmpHex}`;
    }
    hexStr += tmpHex;
  }
  return hexStr.trim();
}

interface CompressOptions {
  data: {};
  compressLenLimit: number;
}

/**
 * 压缩数据
 *
 * @export
 * @param {object} options {data, compressLenLimit = 2048}
 * @returns {promise}
 */
export function compressFilter(options: CompressOptions) {
  const { data, compressLenLimit = 2048 } = options;
  return new Promise((resolve, reject) => {
    if (!data) return resolve(data);

    const strPostData = JSON.stringify(data);
    if (strPostData.length > compressLenLimit) {
      LZMA.compress(JSON.stringify(data), 1, (decompressResult: number[]) => {
        const resultStr = convertToFormatedHex(decompressResult).toString();
        resolve(resultStr);
      });
    } else {
      return resolve(data);
    }
  });
}

/**
 * 解压数据
 *
 * @export
 * @param {string} data 压缩后的字符串
 * @returns {string}
 */
export function decompressFilter(data: string | {}) {
  return new Promise((resolve, reject) => {
    if (typeof data === 'string') {
      const decompressData = convertFormatedHexToBytes(data);
      LZMA.decompress(decompressData, (result: string, err: Error) => {
        let resData = {};
        if (err) return reject(err);
        try {
          resData = JSON.parse(result);
        } catch (e) {
          reject(new Error('decompress fail'));
        }
        resolve(resData);
      });
    } else {
      resolve(data);
    }
  });
}

const defaultDataWrapper = (data: any) => data;

export function compress(compressLenLimit: number, dataWrapper: Function = defaultDataWrapper) {
  return async (data) => {
    const compressOptions: CompressOptions = {
      data,
      compressLenLimit,
    };
    let res = await compressFilter(compressOptions);
    res = dataWrapper(res);
    return res;
  };
}

export function decompress(
  dataWrapperBefore: Function = defaultDataWrapper,
  dataWrapperAfter: Function = defaultDataWrapper
) {
  return async (data) => {
    const decompressData = dataWrapperBefore(data);
    let res = await decompressFilter(decompressData);
    res = dataWrapperAfter(res);
    console.log(res, 'decompress')
    return res;
  };
}