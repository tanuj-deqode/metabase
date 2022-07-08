/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import { recentTableList } from "metabase/new-service";
import { getProject, isDefi360 } from "metabase/lib/project_info";
import { DownOutlined } from "metabase/lib/ant-icon";

const TableRecent = props => {
  const {
    searchKeyValue,
    databaseId,
    handleSelectTable,
    formDataSelector,
  } = props;
  const [recentTable, setRecentTable] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const recentData = async () => {
      setRecentTable([]);
      const { list } = await recentTableList({
        databaseId,
        project: getProject(),
      });
      setRecentTable(list || []);
    };
    !isDefi360() && recentData();
  }, [databaseId, setRecentTable]);

  const menu =
    recentTable?.length && searchKeyValue?.length === 0 && !formDataSelector ? (
      <ul className="question-side__recent">
        <div
          className="question-side__recent-title"
          onClick={() => {
            setOpen(!open);
          }}
        >
          <span className="footprint-primary-text">Recent</span>
          {open ? <DownOutlined rotate={180} /> : <DownOutlined />}
        </div>
        {open && <div className="question-side__recent-title-divider" />}
        {open &&
          recentTable.map(table => {
            return (
              <li
                key={`${table.id}${table.name}`}
                onClick={() => {
                  handleSelectTable({
                    tableId: table.id,
                    tableName: table.name,
                  });
                }}
              >
                <div className="question-side__recent-item">
                  <span className="question-side__recent-item-title">
                    {table.name}
                  </span>
                </div>
              </li>
            );
          })}
      </ul>
    ) : (
      <div />
    );

  return <div>{menu}</div>;
};
export default TableRecent;
