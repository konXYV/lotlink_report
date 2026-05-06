import React, { useCallback, useEffect, useRef, useState } from "react";


const PROVIDERS = ["LTC", "TPLUS", "ETL", "UNITEL"];

const Simaster = () => {
  


  return (
    <div className="flex flex-col gap-4">
      

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row w-full justify-center items-center sm:items-end gap-3">
        <div className="border border-gray-300 rounded mt-5 flex items-center justify-center">
          <select
            name="provider"
           
            className="p-2"
          >
            <option value="PROVIDER">PROVIDER</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex">
        
        </div>

        <div className="relative text-left justify-end flex">
          <button
            type="button"
           
            className="text-white bg-primary hover:bg-green-700/90 font-medium rounded-lg text-sm px-5 py-2.5 inline-flex items-center"
          >
           
          </button>

          <div
            
          >
            
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto bg-gray-100 p-4">
        
          </div>
        ) : (
          <table className="w-full text-sm text-left text-gray-700 border-collapse">
            <thead className="text-xs uppercase font-medium text-gray-900 bg-gray-100 border-t border-b border-gray-200">
              {/* Provider group header */}
              <tr>
                {["LTC", "TPLUS", "ETL", "UNITEL"].map((p) => (
                  <th
                    key={p}
                    colSpan={4}
                    className="border border-gray-300 px-2 py-2 text-center bg-gray-200"
                  >
                    {p}
                  </th>
                ))}
              </tr>
              {/* Column header */}
              <tr>
                {["LTC", "TPLUS", "ETL", "UNITEL"].map((p) =>
                  ["IDX", "PROVIDER", "TIME", "BALANCE"].map((col) => (
                    <th
                      key={`${p}-${col}`}
                      className="border border-gray-300 px-2 py-2"
                    >
                      {col}
                    </th>
                  )),
                )}
              </tr>
            </thead>

            <tbody>
            
               
              
            </tbody>
          </table>
       
      </div>
  
  );
};

export default Simaster;
