import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";

const CollapsibleItem = ({
  title,
  children,
  isCheckAll,
  onCheckAllChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="item-container-style">
      <div className="group-title-container-style">
        <button
          className="group-title-style"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "▼" : "►"} {title}
        </button>
        {isCheckAll !== undefined && (
          <label className="check-all-label">
            <input
              type="checkbox"
              className="check-all-checkbox"
              checked={isCheckAll}
              onChange={onCheckAllChange}
            />
            Check All
          </label>
        )}
      </div>
      {isOpen && <div className="details-container-style">{children}</div>}
    </div>
  );
};

const ApparelList = ({ session }) => {
  const [apparel, setApparel] = useState([]);
  const [completedApparel, setCompletedApparel] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [rarityFilters, setRarityFilters] = useState({
    common: true,
    uncommon: true,
    rare: true,
    'ultra rare': true
  });

  const fetchApparel = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    try {
      const cachedApparel = localStorage.getItem("cachedApparel");
      const cacheTimestamp = localStorage.getItem("apparelCacheTimestamp");
      const cacheAge = Date.now() - parseInt(cacheTimestamp || "0");

      if (cachedApparel && cacheAge < 60 * 60 * 1000) { // 1 hour cache
        setApparel(JSON.parse(cachedApparel));
        setIsLoading(false);
        return;
      }

      let allApparel = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from("apparel")
          .select("*", { count: "exact" })
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order("type", { ascending: true })
          .order("outfit_name", { ascending: true });

        if (error) throw error;

        allApparel = [...allApparel, ...data];
        hasMore = count > (page + 1) * pageSize;
        page++;

        setLoadingProgress(Math.round((allApparel.length / count) * 100));
      }

      setApparel(allApparel);
      localStorage.setItem("cachedApparel", JSON.stringify(allApparel));
      localStorage.setItem("apparelCacheTimestamp", Date.now().toString());
    } catch (error) {
      console.error("Error fetching apparel:", error);
      setApparel([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCompletedApparel = useCallback(async () => {
    if (session) {
      const { data, error } = await supabase
        .from("completed_apparel")
        .select("a_id")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error fetching completed apparel:", error);
      } else {
        const completedApparelIds = data.reduce((acc, item) => {
          acc[item.a_id] = true;
          return acc;
        }, {});
        setCompletedApparel(completedApparelIds);
      }
    } else {
      const savedCompletedApparel = localStorage.getItem("completedApparel");
      if (savedCompletedApparel) {
        setCompletedApparel(JSON.parse(savedCompletedApparel));
      }
    }
  }, [session]);

  useEffect(() => {
    fetchApparel();
  }, [fetchApparel]);

  useEffect(() => {
    fetchCompletedApparel();
  }, [fetchCompletedApparel]);

  const handleCheckboxChange = async (a_id) => {
    const newValue = !completedApparel[a_id];
    const newCompletedApparel = {
      ...completedApparel,
      [a_id]: newValue,
    };
    setCompletedApparel(newCompletedApparel);

    if (session) {
      if (newValue) {
        await supabase
          .from("completed_apparel")
          .insert({ user_id: session.user.id, a_id: a_id });
      } else {
        await supabase
          .from("completed_apparel")
          .delete()
          .match({ user_id: session.user.id, a_id: a_id });
      }
    } else {
      localStorage.setItem("completedApparel", JSON.stringify(newCompletedApparel));
    }
  };

  const handleCheckAll = async (items, checked) => {
    const newCompletedApparel = { ...completedApparel };
    const operations = items.map(item => ({
      user_id: session?.user.id,
      a_id: item.a_id
    }));
  
    if (session) {
      const { error } = checked
        ? await supabase.from("completed_apparel").upsert(operations)
        : await supabase.from("completed_apparel").delete().in('a_id', items.map(item => item.a_id));
      
      if (error) throw error;
    }
  
    items.forEach(item => {
      newCompletedApparel[item.a_id] = checked;
    });
  
    setCompletedApparel(newCompletedApparel);
  
    if (!session) {
      localStorage.setItem("completedApparel", JSON.stringify(newCompletedApparel));
    }
  };

  const handleDownload = () => {
    const completedApparelIds = Object.keys(completedApparel).filter(id => completedApparel[id]);
    const dataStr = JSON.stringify(completedApparelIds);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "completed_apparel.json";

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
          const uploadedData = JSON.parse(e.target.result);
          console.log(`Total apparel to process: ${uploadedData.length}`);
          const newCompletedApparel = { ...completedApparel };

          // Process the uploaded data
          uploadedData.forEach(id => {
            newCompletedApparel[id] = true;
          });

          if (session) {
            const { error } = await supabase
              .from("completed_apparel")
              .upsert(
                Object.keys(newCompletedApparel).map(a_id => ({
                  user_id: session.user.id,
                  a_id: parseInt(a_id)
                })),
                { onConflict: ['user_id', 'a_id'] }
              );

            if (error) {
              throw error;
            }
          } else {
            localStorage.setItem("completedApparel", JSON.stringify(newCompletedApparel));
          }

          setCompletedApparel(newCompletedApparel);
          setUploadStatus("Upload complete. Your progress has been updated.");

          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus("");
          }, 3000);

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

  const handleRarityFilterChange = (rarity) => {
    setRarityFilters(prev => ({
      ...prev,
      [rarity]: !prev[rarity]
    }));
  };

  const organizedApparel = useMemo(() => {
    const organized = {};
    apparel.forEach((item) => {
      if (!organized[item.type]) {
        organized[item.type] = [];
      }
      organized[item.type].push(item);
    });
    return organized;
  }, [apparel]);

  const filteredApparel = useMemo(() => {
    if (!searchTerm && !hideCompleted && Object.values(rarityFilters).every(v => v)) return organizedApparel;

    const filtered = {};
    Object.entries(organizedApparel).forEach(([type, items]) => {
      const filteredItems = items.filter((item) =>
        (!hideCompleted || !completedApparel[item.a_id]) &&
        item.outfit_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        rarityFilters[item.rarity.toLowerCase()]
      );
      if (filteredItems.length > 0) {
        filtered[type] = filteredItems;
      }
    });
    return filtered;
  }, [organizedApparel, searchTerm, hideCompleted, completedApparel, rarityFilters]);

  const { totalApparel, completedApparelCount } = useMemo(() => {
    const total = apparel.length;
    const completed = Object.values(completedApparel).filter(Boolean).length;
    return { totalApparel: total, completedApparelCount: completed };
  }, [apparel, completedApparel]);

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
              <span className="plans-label">Apparel Progress: </span>
              <span className="plans-numbers">
                {completedApparelCount} / {totalApparel}
              </span>
              <span> apparel items collected</span>
            </div>
          </div>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search apparel..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="filter-container">
          <label className="hide-completed-label">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={handleHideCompletedChange}
              className="hide-completed-checkbox"
            />
            Hide Collected
          </label>
          <div className="rarity-filters">
            {Object.keys(rarityFilters).map((rarity) => (
              <label 
                key={rarity} 
                className="rarity-filter-label"
              >
                <input
                  type="checkbox"
                  checked={rarityFilters[rarity]}
                  onChange={() => handleRarityFilterChange(rarity)}
                  className="rarity-filter-checkbox"
                />
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </label>
            ))}
          </div>
        </div>
        {Object.entries(filteredApparel).map(([type, items]) => (
          <CollapsibleItem
            key={type}
            title={type}
            isCheckAll={items.every((item) => completedApparel[item.a_id])}
            onCheckAllChange={() => {
              const allChecked = items.every((item) => completedApparel[item.a_id]);
              handleCheckAll(items, !allChecked);
            }}
          >
            {items.map((item) => (
              <div key={item.a_id} className="plan-container-style">
                <label className="plan-label">
                  <input
                    type="checkbox"
                    className="plan-checkbox-style"
                    checked={completedApparel[item.a_id] || false}
                    onChange={() => handleCheckboxChange(item.a_id)}
                  />
                  <span className="plan-name-style">
                    {item.outfit_name}
                    {item.craftable && (
                      <span className="apparel-symbol craftable-symbol"> [CR]</span>
                    )}
                  </span>
                </label>
              </div>
            ))}
          </CollapsibleItem>
        ))}
      </div>
      {isLoading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>Loading Apparel</h3>
            <p>Please wait while we fetch the apparel. This may take a few moments.</p>
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

export default ApparelList;