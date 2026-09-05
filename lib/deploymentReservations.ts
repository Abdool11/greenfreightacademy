import { supabaseAdmin } from "@/lib/supabase";

export async function reserveQuoteDriverDeploymentOnce(params: {
  quoteId: string;
  driverId: string;
  companyId: string;
  deploymentId: string;
  creditCount: number;
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("reserve_quote_driver_deployment_once", {
    p_quote_id: params.quoteId,
    p_driver_id: params.driverId,
    p_company_id: params.companyId,
    p_deployment_id: params.deploymentId,
    p_credit_count: params.creditCount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
