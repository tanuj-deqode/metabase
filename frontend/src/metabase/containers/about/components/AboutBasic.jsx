/* eslint-disable react/prop-types */
import React from "react";
import data from "../data";
import { getOssUrl } from "metabase/lib/image";
import { Spin } from "antd";
import CountUp from "react-countup";

const AboutBasic = ({ indicator }) => {
  return (
    <div className="About__basic">
      <div className="About__basic-process">
        {data.basicData(indicator).map((item, index) => {
          return (
            <div className="About__basic-item" key={item.title}>
              <div style={{ marginTop: index % 2 === 1 ? 0 : 90 }} />
              <div className="About__basic-item-box">
                <b>
                  {item.total ? (
                    <CountUp
                      formattingFn={(value: number) => value.toLocaleString()}
                      end={item.total}
                    />
                  ) : (
                    <Spin />
                  )}
                </b>
                <h3>{item.title}</h3>
                <img src={item.img} alt={item.title} />
              </div>
              <div className="About__basic-item-circle">
                <div className="About__basic-item-circle-inner" />
              </div>
            </div>
          );
        })}
      </div>
      <img
        className="About__basic-bottom-bg"
        src={getOssUrl("img_about_basic_2022081305.png")}
        alt="bg"
      />
    </div>
  );
};

export default React.memo(AboutBasic);
