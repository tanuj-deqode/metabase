/* eslint-disable react/display-name */
import { Avatar, Dropdown } from "antd";
import dayjs from "dayjs";
import Link from "metabase/components/Link";
import { getOssUrl } from "metabase/lib/image";
import React from "react";
import IconValue from "../IconValue";
import Tags from "../Tags";
import { trackStructEvent } from "metabase/lib/analytics";
import { formatTitle } from "metabase/lib/formatting";
import { sortMap } from "../../shared/config";
import { get } from "lodash";
import Highlighter from "react-highlight-words";
import { isProtocol } from "metabase/containers/dashboards/shared/utils";
import CreatorName from "metabase/components/CreatorName";
import * as Urls from "metabase/lib/urls";
import getActionMenus from "metabase/containers/dashboards/components/Dashboards/helper";
import TableChartInfo from "metabase/query_builder/components/TableChartInfo";

const colors = ["#E4E4FE", "#D9F8F3", "#FFF5D9", "#FFDFE8"];

export default ({
  router,
  user,
  onDuplicate,
  onShare,
  onSeoTagging,
  onHomePriority,
  searchWords,
  device,
  canSort = true,
  gaCategory = "Dashboards",
  isPlain = false,
}) => {
  const isMarket = user && user.isMarket;
  const isAdmin = user && user.is_superuser;
  // const isInner = user?.groups?.includes("Inner");
  const query = router?.location?.query;
  const getLink = record => {
    return record?.model === "dashboard" || record?.type === "dashboard"
      ? Urls.dashboard(record)
      : Urls.guestUrl(record);
  };
  const name = {
    title: "Name",
    key: "name",
    render: (_, record, index) => {
      const backgroundColor = colors[index % colors.length];
      const creatorName = get(record, "creator.name");
      const tags = get(record, "tags");
      const isChart = record?.model === "card" || record?.type === "card";
      return (
        <div className="dashboards__table-name">
          <Link
            to={`/@${creatorName}`}
            // target="_blank"
            onClick={() => trackStructEvent(`${gaCategory} Name`, record.name)}
          >
            {get(record, "creator.avatar") ? (
              <img
                src={
                  get(record, "creator.avatar") +
                  "?x-oss-process=image/resize,m_fill,h_120,w_120"
                }
                className="dashboards__table-name-avatar"
              />
            ) : (
              <Avatar size="small" style={{ backgroundColor }}>
                <span data-nosnippet>
                  {String(get(record, "creator.name[0]")).toUpperCase()}
                </span>
              </Avatar>
            )}
          </Link>
          <div className="dashboards__table-name-info">
            <Link
              className="flex"
              to={getLink(record)}
              // target="_blank"
              onClick={() =>
                trackStructEvent(`${gaCategory} Name`, record.name)
              }
            >
              <h3 style={{ WebkitBoxOrient: "vertical" }}>
                <Highlighter
                  highlightClassName="highlight"
                  searchWords={searchWords}
                  autoEscape={true}
                  textToHighlight={formatTitle(record.name)}
                />
                {record.isHot && (
                  <img
                    src={getOssUrl("icon_hot.svg")}
                    alt={`Hot - ${record.name}`}
                  />
                )}
                {isChart && (
                  <span className="dashboards__table-chart">Chart</span>
                )}
                {!record.publicUuid && (
                  <span className="dashboards__table-private">Private</span>
                )}
                {!!record.hasDeprecated?.length && (
                  <TableChartInfo
                    deprecatedTableConfigList={record.hasDeprecated}
                  />
                )}
              </h3>
            </Link>
            <div>
              {tags?.length ? (
                <Tags
                  router={router}
                  list={tags.slice(0, 10)}
                  searchWords={searchWords}
                  link
                />
              ) : (
                "-"
              )}
            </div>
            <span className="dashboards__table-name-info-creator">
              <CreatorName creatorName={creatorName} />
            </span>
          </div>
        </div>
      );
    },
  };
  const tag = {
    title: "Tags",
    key: "tags",
    dataIndex: "tags",
    width: 400,
    render: tags => {
      return tags?.length ? (
        <Tags
          router={router}
          list={tags.slice(0, 10)}
          searchWords={searchWords}
          link
        />
      ) : (
        "-"
      );
    },
  };
  const views = {
    title: "Views",
    key: "views",
    dataIndex: "statistics",
    width: 120,
    sorter: canSort && !isProtocol(),
    sortDirections: ["descend", "ascend", "descend"],
    sortOrder:
      query?.sortBy === "views"
        ? sortMap[query?.sortDirection] || sortMap.desc
        : undefined,
    render: statistics => {
      return (
        <IconValue
          iconName="read"
          value={get(statistics, "view") || get(statistics, "views") || 0}
        />
      );
    },
  };
  const favoriteTime = {
    title: "Favorite Date",
    key: "favorite_time",
    width: 120,
    sorter: canSort && !isProtocol(),
    sortDirections: ["descend", "ascend", "descend"],
    sortOrder:
      query?.sortBy === "favorite_time"
        ? sortMap[query?.sortDirection] || sortMap.desc
        : undefined,
    render: (_, record) => {
      return (
        <div className="dashboards__table-date">
          {dayjs(record.favoriteTime).format("YYYY-MM-DD")}
        </div>
      );
    },
  };
  const date = {
    title: "Date",
    key: "created_at",
    width: 120,
    sorter: canSort && !isProtocol(),
    sortDirections: ["descend", "ascend", "descend"],
    sortOrder:
      query?.sortBy === "created_at"
        ? sortMap[query?.sortDirection] || sortMap.desc
        : undefined,
    render: (_, record) => {
      return (
        <div className="dashboards__table-date">
          {dayjs(record.createdAt).format("YYYY-MM-DD")}
        </div>
      );
    },
  };
  const action = {
    title: "",
    key: "action",
    align: "right",
    render: (_, record) => {
      const menu = getActionMenus({
        onDuplicate: onDuplicate,
        record: record,
        onShare: onShare,
        onSeoTagging: onSeoTagging,
        onHomePriority: onHomePriority,
        gaCategory: gaCategory,
        user: user,
        isAdmin: isAdmin,
        isMarket: isMarket,
      });
      return (
        <Dropdown overlay={menu} placement="bottomRight">
          <div className="dashboards__table-action">
            <img src={getOssUrl("20220309154118.png")} alt="" />
          </div>
        </Dropdown>
      );
    },
  };
  if (device?.isMobile) {
    return [name, views];
  }
  if (isPlain) {
    return [tag, views];
  }
  if (query?.model === "favorite") {
    return [name, views, favoriteTime, action];
  }
  return [name, views, date, action];
};
