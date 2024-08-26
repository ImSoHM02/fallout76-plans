import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import CollapsibleItem from "./CollapsibleItem";

const PlanList = ({ session }) => {
  const [plans, setPlans] = useState([]);
  const [completedPlans, setCompletedPlans] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    try {
      const cachedPlans = localStorage.getItem("cachedPlans");
      const cacheTimestamp = localStorage.getItem("plansCacheTimestamp");
      const cacheAge = Date.now() - parseInt(cacheTimestamp || "0");
  
      if (cachedPlans && cacheAge < 60 * 60 * 1000) { // 1 hour cache
        setPlans(JSON.parse(cachedPlans));
        setIsLoading(false);
        return;
      }
  
      let allPlans = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
  
      while (hasMore) {
        const { data, error, count } = await supabase
          .from("plans")
          .select("*", { count: "exact" })
          .range(page * pageSize, (page + 1) * pageSize - 1);
  
        if (error) {
          throw error;
        }
  
        allPlans = [...allPlans, ...data];
        hasMore = count > (page + 1) * pageSize;
        page++;
        
        // Update loading progress
        setLoadingProgress(Math.round((allPlans.length / count) * 100));
      }
  
      setPlans(allPlans);
  
      localStorage.setItem("cachedPlans", JSON.stringify(allPlans));
      localStorage.setItem("plansCacheTimestamp", Date.now().toString());
    } catch (error) {
      console.error("Error fetching plans:", error);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCompletedPlans = useCallback(async () => {
    if (session) {
      let allCompletedPlans = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from("completed_plans")
          .select("plan_id", { count: "exact" })
          .eq("user_id", session.user.id)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching completed plans:", error);
          break;
        }

        allCompletedPlans = [...allCompletedPlans, ...data];
        hasMore = count > (page + 1) * pageSize;
        page++;
      }

      const completedPlanIds = allCompletedPlans.reduce((acc, item) => {
        acc[item.plan_id] = true;
        return acc;
      }, {});
      setCompletedPlans(completedPlanIds);
    } else {
      const savedCompletedPlans = localStorage.getItem("completedPlans");
      if (savedCompletedPlans) {
        setCompletedPlans(JSON.parse(savedCompletedPlans));
      }
    }
  }, [session]);

  useEffect(() => {
    fetchPlans();
    fetchCompletedPlans();
  }, [fetchPlans, fetchCompletedPlans]);

  const handleCheckboxChange = async (planId, forceValue = null) => {
    const newValue = forceValue !== null ? forceValue : !completedPlans[planId];
    const newCompletedPlans = {
      ...completedPlans,
      [planId]: newValue,
    };
    setCompletedPlans(newCompletedPlans);

    if (session) {
      if (newValue) {
        const { error } = await supabase
          .from("completed_plans")
          .insert({ user_id: session.user.id, plan_id: planId });

        if (error) console.error("Error saving completed plan:", error);
      } else {
        const { error } = await supabase
          .from("completed_plans")
          .delete()
          .match({ user_id: session.user.id, plan_id: planId });

        if (error) console.error("Error removing completed plan:", error);
      }
    } else {
      localStorage.setItem("completedPlans", JSON.stringify(newCompletedPlans));
    }
  };

  const handleCheckAll = async (items, checked) => {
    const newCompletedPlans = { ...completedPlans };
    const promises = items.map(async (item) => {
      newCompletedPlans[item.planId] = checked;
      if (session) {
        if (checked) {
          await supabase
            .from("completed_plans")
            .upsert({ user_id: session.user.id, plan_id: item.planId });
        } else {
          await supabase
            .from("completed_plans")
            .delete()
            .match({ user_id: session.user.id, plan_id: item.planId });
        }
      }
    });

    await Promise.all(promises);
    setCompletedPlans(newCompletedPlans);

    if (!session) {
      localStorage.setItem("completedPlans", JSON.stringify(newCompletedPlans));
    }
  };

  const handleDownload = () => {
    const completedPlanIds = Object.keys(completedPlans).filter(
      (id) => completedPlans[id]
    );
    const dataStr = JSON.stringify(completedPlanIds);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "completed_plans.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus("Uploading...");
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const uploadedPlanIds = JSON.parse(e.target.result);
          const newCompletedPlans = { ...completedPlans };

          if (session) {
            const batchSize = 1000;
            const totalPlans = uploadedPlanIds.length;

            for (let i = 0; i < uploadedPlanIds.length; i += batchSize) {
              const batch = uploadedPlanIds.slice(
                i,
                Math.min(i + batchSize, uploadedPlanIds.length)
              );
              const { error } = await supabase
                .from("completed_plans")
                .upsert(
                  batch.map((planId) => ({
                    user_id: session.user.id,
                    plan_id: planId,
                  })),
                  { onConflict: ["user_id", "plan_id"], ignoreDuplicates: true }
                );

              if (error) {
                throw error;
              }

              batch.forEach((planId) => {
                newCompletedPlans[planId] = true;
              });

              const progress = Math.round(((i + batch.length) / totalPlans) * 100);
              setUploadProgress(progress);
            }
          } else {
            uploadedPlanIds.forEach((id) => {
              newCompletedPlans[id] = true;
            });
            localStorage.setItem(
              "completedPlans",
              JSON.stringify(newCompletedPlans)
            );
            setUploadProgress(100);
          }

          setCompletedPlans(newCompletedPlans);
          setUploadStatus("Upload complete. All plans have been added.");

          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus("");
          }, 3000);

          await fetchCompletedPlans();
        } catch (error) {
          console.error("Error during upload:", error);
          setUploadStatus("An error occurred during the upload. Please try again.");
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus("");
          }, 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleHideCompletedChange = (event) => {
    setHideCompleted(event.target.checked);
  };

  const { organizedPlans, totalObtainablePlans, totalUnobtainablePlans } =
    useMemo(() => {
      const organized = { obtainable: {}, unobtainable: {} };
      let totalObtainable = 0;
      let totalUnobtainable = 0;

      plans.forEach((plan) => {
        const {
          item_type,
          item_name,
          section,
          name,
          location,
          plan_id,
          obtainable,
        } = plan;

        const category = obtainable === true || obtainable === "true" ? "obtainable" : "unobtainable";
        if (obtainable === true) {
          totalObtainable++;
        } else {
          totalUnobtainable++;
        }

        if (!organized[category][item_type]) organized[category][item_type] = {};
        if (!organized[category][item_type][item_name]) organized[category][item_type][item_name] = {};
        if (!organized[category][item_type][item_name][section]) organized[category][item_type][item_name][section] = [];

        organized[category][item_type][item_name][section].push({
          name,
          location,
          planId: plan_id,
        });
      });

      return {
        organizedPlans: organized,
        totalObtainablePlans: totalObtainable,
        totalUnobtainablePlans: totalUnobtainable,
      };
    }, [plans]);

  const { completedObtainablePlans, completedUnobtainablePlans } =
    useMemo(() => {
      const obtainable = plans.filter(
        (plan) =>
          (plan.obtainable === true || plan.obtainable === "true") &&
          completedPlans[plan.plan_id]
      ).length;

      const unobtainable = plans.filter(
        (plan) =>
          (plan.obtainable === false || plan.obtainable === "false") &&
          completedPlans[plan.plan_id]
      ).length;

      return {
        completedObtainablePlans: obtainable,
        completedUnobtainablePlans: unobtainable,
      };
    }, [plans, completedPlans]);

  const filteredPlans = useMemo(() => {
    if (!searchTerm && !hideCompleted) return organizedPlans;

    const filtered = { obtainable: {}, unobtainable: {} };
    ["obtainable", "unobtainable"].forEach((category) => {
      Object.entries(organizedPlans[category]).forEach(
        ([itemType, itemNames]) => {
          const filteredItemNames = {};
          Object.entries(itemNames).forEach(([itemName, sections]) => {
            const filteredSections = {};
            Object.entries(sections).forEach(([section, items]) => {
              const filteredItems = items.filter(
                (item) =>
                  (!hideCompleted || !completedPlans[item.planId]) &&
                  ((item.name &&
                    item.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())) ||
                    (item.location &&
                      item.location
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())))
              );
              if (filteredItems.length > 0) {
                filteredSections[section] = filteredItems;
              }
            });
            if (Object.keys(filteredSections).length > 0) {
              filteredItemNames[itemName] = filteredSections;
            }
          });
          if (Object.keys(filteredItemNames).length > 0) {
            filtered[category][itemType] = filteredItemNames;
          }
        }
      );
    });
    return filtered;
  }, [organizedPlans, searchTerm, hideCompleted, completedPlans]);

  return (
    <div className="plan-list">
      <div className={`content-wrapper ${isLoading || isUploading ? "blurred" : ""}`}>
        <div className="button-container">
          <button
            onClick={handleDownload}
            className="custom-button"
            disabled={isLoading || isUploading}
          >
            Download Progress
          </button>
          <label className="custom-file-upload">
            <input
              type="file"
              onChange={handleUpload}
              accept=".json"
              disabled={isLoading || isUploading}
            />
            Upload Progress
          </label>
          {(isUploading || uploadStatus) && (
            <span className="loading-indicator">
              {uploadStatus || "Uploading... Please don't refresh the page."}
            </span>
          )}
        </div>
        <div className="infobox">
          <div className="info-container">
            <div className="plans-section">
              <span className="plans-label">Obtainable Progress: </span>
              <span className="plans-numbers">
                {completedObtainablePlans} / {totalObtainablePlans}
              </span>
              <span> obtainable plans completed</span>
            </div>
            <div className="plans-section">
              <span className="plans-label">Unobtainable Progress: </span>
              <span className="plans-numbers">
                {completedUnobtainablePlans} / {totalUnobtainablePlans}
              </span>
              <span> unobtainable plans completed</span>
            </div>
          </div>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search plans..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="hide-completed-container">
          <label className="hide-completed-label">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={handleHideCompletedChange}
              className="hide-completed-checkbox"
            />
Hide Completed
          </label>
        </div>
        {["obtainable", "unobtainable"].map((category) => (
          <div key={category}>
            <h2
              className={
                category === "unobtainable" ? "unobtainable-plans-title" : ""
              }
            >
              {category === "obtainable" ? "Obtainable" : "Unobtainable"} Plans
            </h2>
            {Object.entries(filteredPlans[category]).map(
              ([itemType, itemNames]) => (
                <CollapsibleItem
                  key={itemType}
                  title={itemType}
                  isUnobtainable={category === "unobtainable"}
                >
                  {Object.entries(itemNames).map(([itemName, sections]) => (
                    <CollapsibleItem
                      key={itemName}
                      title={itemName}
                      isUnobtainable={category === "unobtainable"}
                    >
                      {Object.entries(sections).map(([section, items]) => (
                        <CollapsibleItem
                          key={section}
                          title={section}
                          isCheckAll={items.every(
                            (item) => completedPlans[item.planId]
                          )}
                          onCheckAllChange={() => {
                            const allChecked = items.every(
                              (item) => completedPlans[item.planId]
                            );
                            handleCheckAll(items, !allChecked);
                          }}
                          isUnobtainable={category === "unobtainable"}
                        >
                          {items.map((item) => (
                            <div key={item.planId} className="plan-container-style">
                              <label className="plan-label">
                                <input
                                  type="checkbox"
                                  className="plan-checkbox-style"
                                  checked={completedPlans[item.planId] || false}
                                  onChange={() => handleCheckboxChange(item.planId)}
                                />
                                <span
                                  className={`plan-name-style ${
                                    category === "unobtainable" ? "unobtainable-plan" : ""
                                  }`}
                                >
                                  {item.name}
                                </span>
                              </label>
                              <div className="location-text-style">
                                {item.location}
                              </div>
                            </div>
                          ))}
                        </CollapsibleItem>
                      ))}
                    </CollapsibleItem>
                  ))}
                </CollapsibleItem>
              )
            )}
          </div>
        ))}
      </div>
      {isLoading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>Loading Plans</h3>
            <p>Please wait while we fetch the plans. This may take a few moments.</p>
            <progress value={loadingProgress} max="100"></progress>
            <p>{loadingProgress}% Complete</p>
          </div>
        </div>
      )}
      {isUploading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>Uploading Progress</h3>
            <p>{uploadStatus || "Please don't refresh the page. This may take a few moments."}</p>
            <progress value={uploadProgress} max="100"></progress>
            <p>{uploadProgress}% Complete</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanList;