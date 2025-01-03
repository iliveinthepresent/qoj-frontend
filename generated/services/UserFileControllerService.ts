/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseResponseFilePreviewDTO } from "../models/BaseResponseFilePreviewDTO";
import type { BaseResponseListUserFile } from "../models/BaseResponseListUserFile";
import type { BaseResponseMapStringLong } from "../models/BaseResponseMapStringLong";
import type { BaseResponseString } from "../models/BaseResponseString";
import type { BaseResponseVoid } from "../models/BaseResponseVoid";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class UserFileControllerService {
  /**
   * 重命名文件/文件夹
   * 重命名指定路径的文件或文件夹，新名称不能与同目录下的其他文件重名
   * @param path 文件/文件夹路径
   * @param newName 新名称
   * @returns BaseResponseVoid OK
   * @throws ApiError
   */
  public static rename(
    path: string,
    newName: string
  ): CancelablePromise<BaseResponseVoid> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/file/rename",
      query: {
        path: path,
        newName: newName,
      },
    });
  }

  /**
   * 上传文件
   * 上传文件到指定目录，支持大小限制和文件类型校验
   * @param formData
   * @returns BaseResponseString OK
   * @throws ApiError
   */
  public static uploadFile(formData?: {
    /**
     * 文件
     */
    file: Blob;
  }): CancelablePromise<BaseResponseString> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/file/upload",
      formData: formData,
      mediaType: "multipart/form-data",
    });
  }

  /**
   * 移动文件/文件夹
   * 移动文件/文件夹到新的目录，目标路径必须存在且为文件夹
   * @param sourcePath 源文件/文件夹路径
   * @param targetPath 目标目录路径
   * @returns BaseResponseVoid OK
   * @throws ApiError
   */
  public static move(
    sourcePath: string,
    targetPath: string
  ): CancelablePromise<BaseResponseVoid> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/file/move",
      query: {
        sourcePath: sourcePath,
        targetPath: targetPath,
      },
    });
  }

  /**
   * 创建文件夹
   * 在指定目录下创建新文件夹，同名文件夹不允许创建
   * @param name 文件夹名称
   * @param parentPath 父目录路径
   * @returns BaseResponseVoid OK
   * @throws ApiError
   */
  public static createFolder(
    name: string,
    parentPath: string = "/"
  ): CancelablePromise<BaseResponseVoid> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/file/folder",
      query: {
        name: name,
        parentPath: parentPath,
      },
    });
  }

  /**
   * 获取文件访问URL
   * 获取文件的临时访问URL，默认有效期30分钟
   * @param path 文件路径
   * @returns BaseResponseString OK
   * @throws ApiError
   */
  public static getFileUrl(
    path: string
  ): CancelablePromise<BaseResponseString> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/file/url",
      query: {
        path: path,
      },
    });
  }

  /**
   * 获取存储空间统计
   * 获取当前用户的存储空间使用情况，包括已用空间和总空间
   * @returns BaseResponseMapStringLong OK
   * @throws ApiError
   */
  public static getStorageStats(): CancelablePromise<BaseResponseMapStringLong> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/file/storage/stats",
    });
  }

  /**
   * 预览文件
   * 获取文件的预览信息，支持文本、图片、PDF等格式，返回对应的预览URL或内容
   * @param path 文件路径
   * @returns BaseResponseFilePreviewDTO OK
   * @throws ApiError
   */
  public static previewFile(
    path: string
  ): CancelablePromise<BaseResponseFilePreviewDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/file/preview",
      query: {
        path: path,
      },
    });
  }

  /**
   * 获取文件列表
   * 获取指定目录下的文件和文件夹列表，不包括已删除的文件
   * @param path 目录路径
   * @returns BaseResponseListUserFile OK
   * @throws ApiError
   */
  public static listFiles(
    path: string = "/"
  ): CancelablePromise<BaseResponseListUserFile> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/file/list",
      query: {
        path: path,
      },
    });
  }

  /**
   * 删除文件/文件夹
   * 删除指定路径的文件或文件夹，文件夹会递归删除其下所有内容
   * @param path 文件/文件夹路径
   * @returns BaseResponseVoid OK
   * @throws ApiError
   */
  public static delete(path: string): CancelablePromise<BaseResponseVoid> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/file",
      query: {
        path: path,
      },
    });
  }
}
