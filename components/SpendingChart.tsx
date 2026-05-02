import { Dimensions, View } from "react-native";
import { PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function SpendingChart({
  transactions,
}: {
  transactions: any[];
}) {
  const expenses = transactions.filter((t) => t.type === "expense");

  const grouped = expenses.reduce((acc, item) => {
    const key = item.category || "Autres";
    acc[key] = (acc[key] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(grouped).map((key, index) => ({
    name: key,
    amount: grouped[key],
    color: colors[index % colors.length],
    legendFontColor: "#fff",
    legendFontSize: 12,
  }));

  if (data.length === 0) return null;

  return (
    <View style={{ alignItems: "center", marginBottom: 30 }}>
      <PieChart
        data={data}
        width={screenWidth - 40}
        height={180}
        chartConfig={{
          backgroundColor: "transparent",
          backgroundGradientFrom: "transparent",
          backgroundGradientTo: "transparent",
          color: () => `#fff`,
        }}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="10"
        absolute
      />
    </View>
  );
}

const colors = [
  "#22C55E",
  "#38BDF8",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];